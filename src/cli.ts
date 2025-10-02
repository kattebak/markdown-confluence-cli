#!/usr/bin/env node

import assert, { AssertionError } from "node:assert";
import path from "node:path";
import { parseArgs } from "node:util";
import { isAxiosError } from "axios";
import { AttachmentsClient } from "./lib/attachments";
import { AdfDocumentHelper } from "./lib/document";
import { PageClient } from "./lib/page-client";

const options = {
	file: {
		type: "string",
		short: "f",
		description: "Markdown file to sync",
	},
	user: {
		type: "string",
		short: "u",
		description: "Confluence username/email",
		default: process.env.CONFLUENCE_USER,
	},
	token: {
		type: "string",
		short: "t",
		description: "Confluence API token",
		default: process.env.CONFLUENCE_TOKEN,
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
		default: process.env.CONFLUENCE_DOMAIN,
	},
	spaceId: {
		type: "string",
		short: "i",
		description: "Confluence space ID",
		default: process.env.CONFLUENCE_SPACE_ID,
	},
	title: {
		type: "string",
		short: "T",
		description: "Override page title (default: derived from file name)",
	},
} as const;

const { file, attachmentId, pageId, ...allOptions } = options;

const commands = {
	sync: {
		description: "Sync markdown file to page, matched by title",
		options: { ...allOptions, file, title: options.title },
		cmd: (args: Options) => {
			const document = AdfDocumentHelper.fromMarkdownFile(
				args.file,
				args.title,
			);
			const client = new PageClient(args, document);
			return client.sync();
		},
	},
	list: {
		description: "List pages in space",
		options: allOptions,
		cmd: (args: Options) => {
			const document = AdfDocumentHelper.fromMarkdownFile(args.file);
			const client = new PageClient(args, document);
			return client.listPages();
		},
	},
	dump: {
		describe: "Parse page into adf and dump as json string",
		options: { ...allOptions, file },
		cmd: (args: Options) => {
			const document = AdfDocumentHelper.fromMarkdownFile(args.file);
			return document.getContentAsString();
		},
	},
	upload: {
		describe: "Upload attachment to page",
		options: { ...allOptions, pageId },
		cmd: (args: Options) => {
			const uploader = new AttachmentsClient(args);
			return uploader.uploadAttachment(args.pageId, args.file);
		},
	},
	"list-attachments": {
		describe: "List attachments for a page",
		options: { ...allOptions, pageId },
		cmd: (args: Options) => {
			const lister = new AttachmentsClient(args);
			return lister.listAttachmentsForPage(args.pageId);
		},
	},
	get: {
		describe: "Get page from confluence by pageId",
		options: { ...allOptions, pageId },
		cmd: (args: Options) => {
			const client = new PageClient(args);
			return client.getPage(args.pageId);
		},
	},
	"get-attachment": {
		describe: "Get attachment from confluence by attachmentId",
		options: { ...allOptions, attachmentId },
		cmd: (args: Options) => {
			const attachmentGetter = new AttachmentsClient(args);
			return attachmentGetter.getAttachment(args.attachmentId);
		},
	},
} as const;

const { values, positionals } = parseArgs({
	options,
	strict: true,
	allowPositionals: true,
});

export type Command = keyof typeof commands;
export type Options = Required<typeof values>;

const command = positionals[0] as Command;

const usage = () => {
	return (
		`Usage: ${path.basename(process.argv[1])} [command] <options>\n\n` +
		`Options:\n${Object.entries(options)
			.map(([long, opt]) => `  -${opt.short} --${long} <${opt.description}>`)
			.join("\n")}` +
		`\n\nCommands: ${Object.keys(commands).join(" ")}\n`
	);
};

const main = async (command: Command, options: Options) => {
	assert(command, `No command provided`);

	const { options: expectedOptions, cmd } = commands[command] ?? {};
	assert(cmd, `Unknown command: "${command}"`);

	for (const [key, opt] of Object.entries(expectedOptions)) {
		assert(
			key in options,
			`Expected required option: --${key} | -${opt.short} <${opt.type}>`,
		);
	}

	return cmd(options);
};

main(command, values as Options)
	.catch((error) => {
		if (error instanceof AssertionError) {
			console.error(usage());
			console.error(`Error: %s`, error.message);
			process.exit(1);
		}

		if (isAxiosError(error)) {
			console.error(`Error: %s`, error.message);
			process.exit(1);
		}

		return Promise.reject(error);
	})
	.then((output) => {
		console.info(JSON.stringify(output, null, 2));
	});
