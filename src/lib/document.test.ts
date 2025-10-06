import assert from "node:assert";
import path from "node:path";
import test from "node:test";
import { AdfDocumentHelper } from "./document";

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
