# Markdown to Confluence Sync Action

Sync markdown files to Confluence pages using the Confluence REST API v2/v1.

## Usage

### CLI Usage

```bash
markdown-confluence-sync --title <title> -f <file> -u <user> -t <token> -p <page_id> -d <domain> -s <space_id>
```

### Parameters

- `-f, --file`: Path to the markdown file to sync
- `-u, --user`: Confluence username/email
- `-t, --token`: Confluence API token
- `-p, --page-id`: Parent page ID in Confluence
- `-d, --domain`: Confluence domain (e.g., your-company.atlassian.net)
- `-s, --space-id`: Confluence space ID
- `-l --title`: Page title (inferred from the path otherwise)

### Example

Create a new page, or update an existing page:

```bash
npx @kattebak/markdown-confluence-cli sync -l "Markdown to Confluence" -f README.md -u $CONFLUENCE_USER -t $CONFLUENCE_TOKEN -d $CONFLUENCE_DOMAIN -i $CONFLUENCE_SPACE
```

In this case, @kattebak/markdown-confluence-cli will:

- Create the page if it doesn't exist
- Or find the page by title
- Upload images found in markdown
- Update the page to reference confluence page attachments

```mermaid
sequenceDiagram
    participant CC as ConfluenceClient
    participant PA as PageApi (v2)
    participant CAA as ContentAttachmentsApi (v1)
    participant AA as AttachmentApi (v2)
    participant FS as File System

    Note over CC: Initial Create Operation
    CC->>PA: createPage(document)
    PA-->>CC: pageId

    Note over CC: Update with Inline Images
    CC->>CC: updatePageWithInlineImages(pageId, document)
    CC->>CC: traverseForLocalFiles(document)
    CC->>CC: Find local file references in mediaSingle nodes

    rect rgb(255, 255, 200)
        Note over CC, FS: loop [For each local file]
        CC->>FS: Check file exists
        FS-->>CC: File buffer

        Note over CC, CAA: Upload using v1 API
        CC->>CAA: uploadAttachment(pageId, filePath)
        CAA->>CAA: createOrUpdateAttachments()
        CAA-->>CC: attachmentInfo (id, title, mediaType)

        Note over CC, AA: Get details using v2 API
        CC->>AA: getAttachment(attachmentId)
        AA->>AA: getAttachmentById()
        AA-->>CC: attachmentDetails (fileId, downloadLink)

        Note over CC: Update media node with attachment info
        CC->>CC: Set attrs: id=fileId, collection=contentId-pageId, type=file
    end

    CC->>PA: getPage(pageId)
    PA-->>CC: currentPage (version info)
    CC->>PA: updatePage(pageInfo, updatedDocument)
    PA-->>CC: Updated page with attachments

```

### Documentation

This implementation has been completely reverse-engineered, because Atlassian provides no documentation on how to deal with the _adf_ format in the REST api. By uploading pages in _adf_ you get the modern rendering behaviour and editor. If you don't care for any of that, you could simply post HTML with inlined images instead.

- https://github.com/marketplace/actions/markdown-to-confluence-sync
- https://www.npmjs.com/package/@telefonica/markdown-confluence-sync

I learned a lot from studying these implementations as well.

### Development

Test cli in development:

```
tsx src/cli.ts sync -f README.md -u $CONFLUENCE_USER -t $CONFLUENCE_TOKEN -d $CONFLUENCE_DOMAIN -i $CONFLUENCE_SPACE_ID
```
