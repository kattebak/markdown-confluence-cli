#!/usr/bin/env node

import { parseArgs } from "node:util";
import { AttachmentsClient } from "./lib/attachments";
import { PageClient } from "./lib/client";
import { AdfDocumentHelper } from "./lib/document";

const commands = [
	"sync",
	"list",
	"create",
	"update",
	"dump",
	"upload",
	"list-attachments",
	"get",
	"get-attachment",
] as const;

type Command = (typeof commands)[number];

export interface CliArgs {
	command: Command;
	file?: string;
	user: string;
	token: string;
	pageId?: string;
	attachmentId?: string;
	domain: string;
	spaceId: string;
}

function parseCliArgs(): CliArgs {
	const { values, positionals } = parseArgs({
		options: {
			file: {
				type: "string",
				short: "f",
				description: "Markdown file to sync",
			},
			user: {
				type: "string",
				short: "u",
				description: "Confluence username/email",
			},
			token: {
				type: "string",
				short: "t",
				description: "Confluence API token",
			},
			pageId: {
				type: "string",
				short: "p",
				description: "Parent page ID in Confluence",
			},
			attachmentId: {
				type: "string",
				short: "a",
				description: "Attachment ID",
			},
			domain: {
				type: "string",
				short: "d",
				description: "Confluence domain (e.g., your-company.atlassian.net)",
			},
			spaceId: {
				type: "string",
				short: "i",
				description: "Confluence space ID",
			},
		},
		allowPositionals: true,
	});

	// Validate command
	const command = positionals[0] as Command;
	if (!commands.includes(command)) {
		console.error(
			"Error: Command is required. Available commands: sync, list, create, update, upload, list-attachments, get, update-with-attachments, get-attachment",
		);
		console.error("Usage: node cli.js <command> [options]");
		console.error(
			"  sync                    - Synchronize page (list/create/update as needed)",
		);
		console.error("  list                    - List all pages in the space");
		console.error(
			"  create                  - Force create page (will log errors if exists)",
		);
		console.error(
			"  update                  - Force update page (will log errors if not found)",
		);
		console.error(
			"  upload                  - Upload file as attachment to page",
		);
		console.error("  list-attachments        - List attachments for a page");
		console.error("  get                     - Get page content by ID");
		console.error(
			"  update-with-attachments - Update page and upload local files as attachments",
		);
		console.error(
			"  get-attachment          - Get attachment details by attachment ID",
		);
		process.exit(1);
	}

	// Validate required arguments for all commands
	if (!values.user || !values.token || !values.domain || !values.spaceId) {
		console.error(
			"Error: Required arguments: -u <user> -t <token> -d <domain> -i <space_id>",
		);
		process.exit(1);
	}

	// Validate file argument for commands that need it
	if (
		["sync", "create", "update", "upload"].includes(command) &&
		!values.file
	) {
		console.error(`Error: Command '${command}' requires -f <file> argument`);
		process.exit(1);
	}

	// Validate pageId for upload, list-attachments, get, and update-with-attachments commands
	if (
		(command === "upload" ||
			command === "list-attachments" ||
			command === "get") &&
		!values.pageId
	) {
		console.error(`Error: Command '${command}' requires -p <pageId> argument`);
		process.exit(1);
	}

	// Validate attachmentId for get-attachment command
	if (command === "get-attachment" && !values.attachmentId) {
		console.error(
			`Error: Command '${command}' requires -a <attachmentId> argument`,
		);
		process.exit(1);
	}

	return {
		command,
		file: values.file,
		user: values.user,
		token: values.token,
		pageId: values.pageId,
		attachmentId: values.attachmentId,
		domain: values.domain,
		spaceId: values.spaceId,
	};
}

export interface PageInfo {
	id: string;
	title: string;
	version: number;
}

async function main() {
	const args = parseCliArgs() as Required<CliArgs>;
	const document = args.file
		? AdfDocumentHelper.fromMarkdownFile(args.file)
		: undefined;
	const client = new PageClient(args, document);

	if (args.command !== "list" && !args.file) {
		console.error(
			`Error: File argument is required for ${args.command} command`,
		);
		process.exit(1);
	}

	try {
		switch (args.command) {
			case "list":
				await client.listPages();
				break;
			case "create": {
				const createResult = await client.forceCreatePage();
				console.info(JSON.stringify(createResult));
				break;
			}
			case "upload": {
				const uploader = new AttachmentsClient(args);
				const uploadResult = await uploader.uploadAttachment(
					args.pageId,
					args.file,
				);
				console.info(JSON.stringify(uploadResult));
				break;
			}
			case "list-attachments": {
				const lister = new AttachmentsClient(args);
				const attachments = await lister.listAttachmentsForPage(args.pageId);
				console.info(JSON.stringify(attachments));
				break;
			}
			case "get": {
				const pageContent = await client.getPage(args.pageId);
				console.info(JSON.stringify(pageContent));
				break;
			}
			case "sync": {
				const pageContent = await client.sync();
				console.info(JSON.stringify(pageContent));
				break;
			}
			case "get-attachment": {
				const attachmentGetter = new AttachmentsClient(args);
				const attachmentDetails = await attachmentGetter.getAttachment(
					args.attachmentId,
				);
				console.info(JSON.stringify(attachmentDetails));
				break;
			}
			case "dump":
				console.info(document?.getContentAsString());
				break;
			default:
				console.error(`Error: Unknown command: ${args.command}`);
				process.exit(1);
		}
	} catch (error: unknown) {
		console.error(
			`Error executing ${args.command} command:`,
			(error as Error).message || error,
		);
		console.error(error);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}
