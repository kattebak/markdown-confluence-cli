import assert from "node:assert";
import * as path from "node:path";
import {
	Configuration,
	type CreatePage200Response,
	type MultiEntityResultPage,
	PageApi,
	type PageBulk,
} from "@kattebak/confluence-axios-client-v2";
import type { CliArgs, PageInfo } from "../cli";
import { AttachmentsClient } from "./attachments";
import type { AdfDocumentHelper, AdfNode } from "./document";

const isLocalFile = (url?: string): boolean => {
	// Check if URL is a local file path (starts with ./ or ../ or is a relative path)
	return (
		!!url &&
		(url.startsWith("./") ||
			url.startsWith("../") ||
			(!url.startsWith("http") && !url.startsWith("//")))
	);
};

export class PageClient {
	private pageApi: PageApi;
	private args: CliArgs;
	private document?: AdfDocumentHelper;

	constructor(args: CliArgs, document?: AdfDocumentHelper) {
		this.args = args;
		this.document = document;
		const configuration = new Configuration({
			basePath: `https://${args.domain}/wiki/api/v2`,
			username: args.user,
			password: args.token,
		});
		this.pageApi = new PageApi(configuration);
	}

	async findPageByTitle(title: string): Promise<Required<PageBulk> | null> {
		const { data } = await this.pageApi.getPages({
			title: title,
			spaceId: [parseInt(this.args.spaceId, 10)],
			status: ["current"],
		});

		const [page] = data?.results ?? [];
		return page ? (page as Required<PageBulk>) : null;
	}

	async createPage(
		document: AdfDocumentHelper,
	): Promise<Required<CreatePage200Response>> {
		const pageData = {
			pageId: this.args.pageId,
			spaceId: this.args.spaceId,
			status: "current" as const,
			title: document.title,
			body: {
				representation: "atlas_doc_format" as const,
				value: document.getContentAsString(),
			},
		};

		const { data } = await this.pageApi.createPage({
			createPageRequest: pageData,
		});

		return data as Required<CreatePage200Response>;
	}

	async updatePage(pageInfo: PageInfo): Promise<CreatePage200Response> {
		const { document } = this;

		assert(document);

		const updateData = {
			id: pageInfo.id,
			status: "current" as const,
			title: document.title,
			body: {
				representation: "atlas_doc_format" as const,
				value: document.getContentAsString(),
			},
			version: {
				number: pageInfo.version + 1,
				message: `Updated from ${document.sourceFile || "ADF document"}`,
			},
		};

		const { data } = await this.pageApi.updatePage({
			id: parseInt(pageInfo.id, 10),
			updatePageRequest: updateData,
		});

		return data;
	}

	async getPage(pageId: string): Promise<Required<CreatePage200Response>> {
		const { data } = await this.pageApi.getPageById({
			id: parseInt(pageId, 10),
			bodyFormat: "atlas_doc_format",
		});

		return data as Required<CreatePage200Response>;
	}

	async listPages(): Promise<MultiEntityResultPage> {
		const { data } = await this.pageApi.getPagesInSpace({
			id: parseInt(this.args.spaceId, 10),
		});

		return data;
	}

	async forceCreatePage(): Promise<CreatePage200Response> {
		if (!this.document) {
			throw new Error("Document is required for create command");
		}

		return this.createPage(this.document);
	}

	async findOrCreatePage(
		document: AdfDocumentHelper,
	): Promise<Required<CreatePage200Response>> {
		const current = await this.findPageByTitle(document.title);

		if (!current) {
			return this.createPage(document);
		}

		return this.getPage(current.id);
	}

	async sync(): Promise<CreatePage200Response> {
		if (!this.document) {
			throw new Error("Document is required for create command");
		}

		const attachments = new AttachmentsClient(this.args);
		const basePath = path.dirname(this.document.sourceFile ?? "");

		// First ensure the page exists (find or create)
		const current = await this.findOrCreatePage(this.document);
		const { title, id, version } = current;

		const fileNodes: AdfNode[] = [];

		this.document.traverse(async (node: AdfNode) => {
			if (node.type !== "mediaSingle") return;
			if (!node.content) return;
			if (!node.content.length) return;
			if (!isLocalFile(node.content[0].attrs?.url)) return;

			fileNodes.push(node);
		});

		for (const node of fileNodes) {
			if (!node.content) continue;
			if (!node.content.length) continue;

			const mediaNode = node.content[0];
			const filePath = mediaNode.attrs?.url as unknown as string;
			const fileName = path.basename(filePath);
			const sourcePath = path.resolve(path.join(basePath, filePath));
			const upload = await attachments.uploadAttachment(id, sourcePath);

			const info = await attachments.getAttachment(upload.id);

			mediaNode.attrs = {
				...mediaNode.attrs,
				id: info.fileId,
				collection: `contentId-${id}`,
				width: "860",
				height: "860",
				type: "file",
				alt: fileName,
				url: "",
			};
		}

		// After processing inline images, update the page again with the modified document
		return this.updatePage({
			id,
			title,
			version: version.number ?? 0,
		});
	}
}
