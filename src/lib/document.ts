import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

export class AdfDocumentHelper {
	readonly title: string;
	readonly content: AdfNode;
	readonly sourceFile?: string;

	constructor(title: string, adfContent: AdfNode, sourceFile?: string) {
		this.title = title;
		this.content = adfContent;
		this.sourceFile = sourceFile;
	}

	static fromMarkdownFile(filePath: string): AdfDocumentHelper {
		const resolvedPath = resolve(filePath);
		const markdownContent = readFileSync(resolvedPath, "utf-8");
		const adfContent = markdownToAdf(markdownContent);
		const title = AdfDocumentHelper.getPageTitleFromPath(filePath);

		return new AdfDocumentHelper(title, adfContent, filePath);
	}

	private static getPageTitleFromPath(filePath: string): string {
		return filePath.split("/").pop()?.replace(".md", "") || "Untitled";
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

	private traverseContent(
		node: AdfNode,
		callback: (node: AdfNode) => void,
	): void {
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
