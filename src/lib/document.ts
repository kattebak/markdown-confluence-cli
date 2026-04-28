import { readFileSync } from "node:fs";
import path, { resolve } from "node:path";
import { markdownToAdf } from "marklassian";

export interface AdfNode {
	type: string;
	attrs?: Record<string, string>;
	content?: AdfNode[];
	marks?: AdfMark[];
	text?: string;
}
interface AdfMark {
	type: string;
	attrs?: Record<string, unknown>;
}

interface Frontmatter {
	confluence_page_id?: string;
	confluence_page_title?: string;
	confluence_parent_id?: string;
}

export function parseFrontmatter(content: string): {
	frontmatter: Frontmatter;
	body: string;
} {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
	if (!match) return { frontmatter: {}, body: content };

	const frontmatter: Frontmatter = {};
	for (const line of match[1].split(/\r?\n/)) {
		const sep = line.indexOf(":");
		if (sep === -1) continue;
		const key = line.slice(0, sep).trim();
		const value = line.slice(sep + 1).trim();
		if (key === "confluence_page_id") frontmatter.confluence_page_id = value;
		if (key === "confluence_page_title")
			frontmatter.confluence_page_title = value;
		if (key === "confluence_parent_id")
			frontmatter.confluence_parent_id = value;
	}

	return { frontmatter, body: content.slice(match[0].length) };
}

export class AdfDocumentHelper {
	readonly title: string;
	readonly content: AdfNode;
	readonly sourceFile?: string;
	readonly confluencePageId?: string;
	readonly confluencePageTitle?: string;
	readonly confluenceParentId?: string;

	constructor(
		title: string,
		adfContent: AdfNode,
		sourceFile?: string,
		frontmatter?: Frontmatter,
	) {
		this.title = title;
		this.content = adfContent;
		this.sourceFile = sourceFile;
		this.confluencePageId = frontmatter?.confluence_page_id;
		this.confluencePageTitle = frontmatter?.confluence_page_title;
		this.confluenceParentId = frontmatter?.confluence_parent_id;
	}

	static fromMarkdownFile(
		filePath: string,
		overrideTitle?: string,
	): AdfDocumentHelper {
		const resolvedPath = resolve(filePath);
		const markdownContent = readFileSync(resolvedPath, "utf-8");
		const { frontmatter, body } = parseFrontmatter(markdownContent);
		const adfContent = markdownToAdf(body);
		const title =
			frontmatter.confluence_page_title ||
			overrideTitle ||
			AdfDocumentHelper.getPageTitleFromPath(filePath);
		return new AdfDocumentHelper(title, adfContent, filePath, frontmatter);
	}

	private static getPageTitleFromPath(filePath: string): string {
		return path.basename(filePath, path.extname(filePath));
	}

	getContentAsString(): string {
		return JSON.stringify(this.content);
	}

	listImages(): string[] {
		const images: string[] = [];
		this.traverseContent(this.content, (node: AdfNode) => {
			if (node.type === "media" && node.attrs?.url) {
				images.push(node.attrs.url);
			}
		});
		return images;
	}

	public traverse(visitor: (node: AdfNode) => void) {
		this.traverseContent(this.content, visitor);
	}

	private traverseContent(node: AdfNode, callback: (node: AdfNode) => void) {
		if (!node || typeof node !== "object") {
			return;
		}

		callback(node);

		if (Array.isArray(node.content)) {
			for (const child of node.content) {
				this.traverseContent(child, callback);
			}
		}
	}
}
