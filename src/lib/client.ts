import { randomUUID } from "node:crypto";
import * as path from "node:path";
import {
    Configuration,
    type CreatePage200Response,
    PageApi,
    type PageBulk,
} from "@kattebak/confluence-axios-client-v2";
import { AdfDocumentHelper, type AdfNode } from "./document";
import type { CliArgs, PageInfo } from "../cli";
import { ConfluencePageAttachments } from "./attachments";

export class ConfluenceClient {
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
    ): Promise<CreatePage200Response> {
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

        return data;
    }

    async updatePage(
        pageInfo: PageInfo,
        document: AdfDocumentHelper,
    ): Promise<CreatePage200Response> {
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

    async listPages(): Promise<void> {
        console.warn(`Listing pages in space ID: ${this.args.spaceId}...`);

        const { data } = await this.pageApi.getPagesInSpace({
            id: parseInt(this.args.spaceId, 10),
        });

        console.table(data);
    }

    async forceCreatePage(): Promise<CreatePage200Response> {
        if (!this.document) {
            throw new Error("Document is required for create command");
        }

        return this.createPage(this.document);
    }

    async sync(): Promise<CreatePage200Response> {
        if (!this.document) {
            throw new Error("Document is required for sync command");
        }

        const current = await this.findPageByTitle(this.document.title);

        if (current) {
            return this.updatePage(
                {
                    id: current.id,
                    title: current.title,
                    version: current.version.number ?? 0,
                },
                this.document,
            );
        }

        return this.createPage(this.document);
    }

    async updatePageWithInlineImages(
        pageId: string,
        document: AdfDocumentHelper,
    ): Promise<CreatePage200Response> {
        console.warn(`Processing attachments for page: ${document.title}...`);

        const attachmentUploader = new ConfluencePageAttachments(this.args);
        const documentCopy = JSON.parse(JSON.stringify(document.content));

        // Find all local file references in mediaSingle nodes
        const localFiles: Array<{ node: unknown; filePath: string }> = [];
        this.traverseForLocalFiles(documentCopy, localFiles, document.sourceFile);

        console.warn(
            `Found ${localFiles.length} local files to upload as attachments`,
        );

        // Process files one by one
        for (const { node, filePath } of localFiles) {
            console.warn(`Uploading file as attachment: ${filePath}`);

            // Upload the file as an attachment
            const attachmentInfo = await attachmentUploader.uploadAttachment(
                pageId,
                filePath,
            );

            // Get the attachment details to retrieve the fileId
            const attachmentDetails = await attachmentUploader.getAttachment(
                attachmentInfo.id,
            );

            // Update the media node with attachment information
            const mediaNode = node.content[0]; // mediaSingle contains media node
            const fileName = path.basename(filePath);

            mediaNode.attrs = {
                ...mediaNode.attrs,
                id: attachmentDetails.fileId || randomUUID(),
                collection: `contentId-${pageId}`,
                width: 860,
                height: 860,
                type: "file",
                alt: fileName,
                url: undefined, // Remove local URL
            };

            console.warn(
                `Updated media node for attachment: ${fileName} (FileID: ${attachmentDetails.fileId})`,
            );
        }

        // Get current page info for version
        const { id, title, version } = await this.getPage(pageId);

        // Update the page with the modified content
        const updatedDocument = new AdfDocumentHelper(
            document.title,
            documentCopy,
            document.sourceFile,
        );

        const result = await this.updatePage(
            {
                id,
                title,
                version: version.number ?? 0,
            },
            updatedDocument,
        );

        return result;
    }

    private traverseForLocalFiles(
        node: AdfNode,
        localFiles: Array<{ node: AdfNode; filePath: string }>,
        sourceFile?: string,
    ): void {
        if (!node || typeof node !== "object") {
            return;
        }

        // Check if this is a mediaSingle node with a local file reference
        if (
            node.type === "mediaSingle" &&
            node.content &&
            node.content[0]?.type === "media"
        ) {
            const mediaNode = node.content[0];
            const url = mediaNode.attrs?.url;

            if (url && this.isLocalFile(url)) {
                // Resolve relative path based on source file location
                const resolvedPath = sourceFile
                    ? path.resolve(path.dirname(sourceFile), url)
                    : path.resolve(url);

                localFiles.push({ node, filePath: resolvedPath });
            }
        }

        // Recursively traverse content
        if (Array.isArray(node.content)) {
            for (const child of node.content) {
                this.traverseForLocalFiles(child, localFiles, sourceFile);
            }
        }
    }

    private isLocalFile(url: string): boolean {
        // Check if URL is a local file path (starts with ./ or ../ or is a relative path)
        return (
            url.startsWith("./") ||
            url.startsWith("../") ||
            (!url.startsWith("http") && !url.startsWith("//"))
        );
    }
}
