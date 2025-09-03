# Markdown to Confluence Sync Action

A GitHub Action to sync markdown files to Confluence pages using the Confluence REST API v2.

## Features

- Converts markdown to Atlassian Document Format (ADF) using `marklassian`
- Creates pages as subpages of a specified parent page
- Uses Node.js built-in argument parser
- TypeScript implementation with full type safety

## Usage

### CLI Usage

```bash
node dist/cli.js -f <file> -u <user> -t <token> -p <page_id> -d <domain> -s <space_id>
```

### Parameters

- `-f, --file`: Path to the markdown file to sync
- `-u, --user`: Confluence username/email
- `-t, --token`: Confluence API token
- `-p, --page-id`: Parent page ID in Confluence
- `-d, --domain`: Confluence domain (e.g., your-company.atlassian.net)
- `-s, --space-id`: Confluence space ID

### Example

```bash
node dist/cli.js -f README.md -u user@example.com -t your-api-token -p 123456789 -d your-company.atlassian.net -s MYSPACE
```

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev -- -f README.md -u user@example.com -t token -p 123456789 -d your-company.atlassian.net -s MYSPACE
```

## Configuration

All configuration is now done via CLI parameters. No environment variables or manual code changes are needed.

## Dependencies

- `marklassian`: Converts markdown to ADF format
- `@kattebak/confluence-axios-client-v2`: Confluence REST API v2 client
- Node.js built-in `util.parseArgs` for argument parsing

## Future Enhancements

- [ ] Support for glob patterns to sync multiple files
- [ ] Update existing pages instead of just creating new ones
- [ ] Configuration file support
- [ ] Environment variable support for credentials
- [ ] Better error handling and logging

## Architecture

### updatePageWithInlineImages Flow

The following sequence diagram shows how the `updatePageWithInlineImages` method processes local images and uploads them as attachments to Confluence:

![diagram](./diagram.png)

### API Version Usage

- **v1 API**: Used for uploading attachments (`ContentAttachmentsApi`)
- **v2 API**: Used for page operations and retrieving attachment details (`PageApi`, `AttachmentApi`)

The dual API approach is necessary because:

- v1 API provides the most reliable attachment upload functionality
- v2 API provides better structured responses and fileId information needed for inline media references

## Thanks to

Many thanks to marklassian

![And a test svg image](./star.drawio.svg)
