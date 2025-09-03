import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { markdownToAdf } from "marklassian";

export interface AdfNode {
	type: string;
	attrs?: Record<string, unknown>;
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

	static fromAdf(title: string, adfContent: AdfNode): AdfDocumentHelper {
		return new AdfDocumentHelper(title, adfContent);
	}

	private static getPageTitleFromPath(filePath: string): string {
		return filePath.split("/").pop()?.replace(".md", "") || "Untitled";
	}

	getContentAsString(): string {
		return JSON.stringify(this.content);
	}

	/**
	 * Lists all image URLs found in the ADF content
	 */
	listImages(): string[] {
		const images: string[] = [];
		this.traverseContent(this.content, (node: AdfNode) => {
			if (node.type === "media" && node.attrs?.url) {
				images.push(node.attrs.url);
			}
		});
		return images;
	}

	/**
	 * Replaces image URLs in the ADF content (mutates the original content)
	 * @param originalUrl The original URL to replace
	 * @param newUrl The new URL to replace it with
	 */
	replaceImageUrl(originalUrl: string, newUrl: string): void {
		this.traverseContent(this.content, (node: AdfNode) => {
			if (node.type === "media" && node.attrs?.url === originalUrl) {
				node.attrs.url = newUrl;
			}
		});
	}

	/**
	 * Recursively traverses ADF content and applies a callback to each node
	 */
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
