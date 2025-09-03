import * as fs from "node:fs";
import * as path from "node:path";
import {
	ContentAttachmentsApi as ContentAttachmentsApiV1,
	Configuration as V1Configuration,
} from "@kattebak/confluence-axios-client-v1";
import {
	AttachmentApi,
	type AttachmentBulk,
	type GetAttachmentById200Response,
	Configuration as V2Configuration,
} from "@kattebak/confluence-axios-client-v2";
import type { CliArgs } from "../cli";

export interface UploadOptions {
	minorEdit?: boolean;
	comment?: string;
}

export class ConfluencePageAttachments {
	private attachmentApiv1: ContentAttachmentsApiV1;
	private attachmentApiv2: AttachmentApi;

	constructor(args: CliArgs) {
		const v1Configuration = new V1Configuration({
			basePath: `https://${args.domain}`,
			username: args.user,
			password: args.token,
		});
		this.attachmentApiv1 = new ContentAttachmentsApiV1(v1Configuration);

		const v2Configuration = new V2Configuration({
			basePath: `https://${args.domain}/wiki/api/v2`,
			username: args.user,
			password: args.token,
		});
		this.attachmentApiv2 = new AttachmentApi(v2Configuration);
	}

	async uploadAttachment(
		pageId: string,
		filePath: string,
		options: UploadOptions = {},
	) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`File not found: ${filePath}`);
		}

		const fileName = path.basename(filePath);
		const fileBuffer = fs.readFileSync(filePath);

		const file = new File([fileBuffer], fileName);
		const minorEditFile = new File(
			[options.minorEdit ? "true" : "false"],
			"minorEdit",
		);
		const commentFile = options.comment
			? new File([options.comment], "comment")
			: undefined;

		const response = await this.attachmentApiv1.createOrUpdateAttachments({
			id: pageId,
			file: file,
			minorEdit: minorEditFile,
			comment: commentFile,
		});

		return response.data;
	}

	/**
	 * List all attachments for a given page using v2 API
	 * @param pageId The ID of the page to list attachments for
	 */
	async listAttachmentsForPage(pageId: string): Promise<AttachmentBulk[]> {
		const response = await this.attachmentApiv2.getPageAttachments({
			id: parseInt(pageId, 10),
		});

		return response.data.results as AttachmentBulk[];
	}

	/**
	 * Get attachment details by attachment ID using v2 API
	 * @param attachmentId The ID of the attachment to retrieve
	 */
	async getAttachment(
		attachmentId: string,
	): Promise<GetAttachmentById200Response> {
		const response = await this.attachmentApiv2.getAttachmentById({
			id: attachmentId,
		});

		return response.data;
	}
}
