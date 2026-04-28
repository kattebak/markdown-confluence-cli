import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AdfDocumentHelper, parseFrontmatter } from "./document";

test("AdfDocumentHelper.listImages returns an array (README.md)", () => {
	const adfDoc = AdfDocumentHelper.fromMarkdownFile("README.md");
	const images = adfDoc.listImages();
	assert.ok(Array.isArray(images));
});

test("AdfDocumentHelper.traverse visits all nodes (README.md)", () => {
	const adfDoc = AdfDocumentHelper.fromMarkdownFile("README.md");
	let nodeCount = 0;
	adfDoc.traverse(() => {
		nodeCount++;
	});
	assert.ok(nodeCount > 0, "Should visit at least one node");
});

test("AdfDocumentHelper infers title from file name", () => {
	const adfDoc = AdfDocumentHelper.fromMarkdownFile("README.md");
	assert.strictEqual(adfDoc.title, "README");
});

test("AdfDocumentHelper overrides title if provided", () => {
	const adfDoc = AdfDocumentHelper.fromMarkdownFile("README.md", "CustomTitle");
	assert.strictEqual(adfDoc.title, "CustomTitle");
});

test("AdfDocumentHelper handles special characters in file name", () => {
	const filePath = path.join(__dirname, "spécial-chär.md");
	// Create the file for this test
	require("node:fs").writeFileSync(filePath, "# Special chars\n");
	const adfDoc = AdfDocumentHelper.fromMarkdownFile(filePath);
	assert.strictEqual(adfDoc.title, "spécial-chär");
	require("node:fs").unlinkSync(filePath);
});

test("parseFrontmatter extracts confluence_page_title", () => {
	const { frontmatter, body } = parseFrontmatter(
		"---\nconfluence_page_title: My Page\n---\n# Hello\n",
	);
	assert.strictEqual(frontmatter.confluence_page_title, "My Page");
	assert.strictEqual(body, "# Hello\n");
});

test("parseFrontmatter extracts confluence_page_id", () => {
	const { frontmatter } = parseFrontmatter(
		"---\nconfluence_page_id: 2223177735\n---\nContent\n",
	);
	assert.strictEqual(frontmatter.confluence_page_id, "2223177735");
});

test("parseFrontmatter returns empty frontmatter for plain markdown", () => {
	const { frontmatter, body } = parseFrontmatter("# Just markdown\n");
	assert.deepStrictEqual(frontmatter, {});
	assert.strictEqual(body, "# Just markdown\n");
});

test("fromMarkdownFile uses confluence_page_title from frontmatter", () => {
	const tmp = path.join(os.tmpdir(), "fm-title-test.md");
	fs.writeFileSync(tmp, "---\nconfluence_page_title: FM Title\n---\n# Body\n");
	const doc = AdfDocumentHelper.fromMarkdownFile(tmp);
	assert.strictEqual(doc.title, "FM Title");
	fs.unlinkSync(tmp);
});

test("fromMarkdownFile stores confluence_page_id", () => {
	const tmp = path.join(os.tmpdir(), "fm-id-test.md");
	fs.writeFileSync(tmp, "---\nconfluence_page_id: 12345\n---\n# Body\n");
	const doc = AdfDocumentHelper.fromMarkdownFile(tmp);
	assert.strictEqual(doc.confluencePageId, "12345");
	fs.unlinkSync(tmp);
});

test("frontmatter title takes precedence over overrideTitle", () => {
	const tmp = path.join(os.tmpdir(), "fm-precedence-test.md");
	fs.writeFileSync(
		tmp,
		"---\nconfluence_page_title: Frontmatter Wins\n---\n# Body\n",
	);
	const doc = AdfDocumentHelper.fromMarkdownFile(tmp, "CLI Title");
	assert.strictEqual(doc.title, "Frontmatter Wins");
	fs.unlinkSync(tmp);
});

test("overrideTitle is used when no frontmatter title", () => {
	const doc = AdfDocumentHelper.fromMarkdownFile("README.md", "CLI Title");
	assert.strictEqual(doc.title, "CLI Title");
});

test("AdfDocumentHelper throws on non-existent file", (_t) => {
	assert.throws(() => {
		AdfDocumentHelper.fromMarkdownFile("/tmp/this_file_does_not_exist.md");
	});
});

test("AdfDocumentHelper throws on empty file path", () => {
	assert.throws(() => {
		AdfDocumentHelper.fromMarkdownFile("");
	});
});

test("AdfDocumentHelper parses content as ADF", () => {
	const adfDoc = AdfDocumentHelper.fromMarkdownFile("README.md");
	assert.ok(adfDoc.content);
	assert.strictEqual(typeof adfDoc.getContentAsString(), "string");
});
