# markdown-confluence-forge-app

A Forge app with a single web trigger (`sync-proxy`) that proxies Confluence REST calls through
`api.asApp().requestConfluence()`, so pages and attachments the CLI writes are authored by the app
instead of a person.

## Handler contract

The web trigger requires header `x-sync-secret` to equal the `SYNC_SECRET` environment variable
(401 otherwise). The request body is JSON:

```
{ method, path, query?, headers?, body?, bodyEncoding?: "json" | "base64" }
```

`path` must start with `/wiki/` (400 otherwise). The response body is JSON:

```
{ statusCode, headers?, body?, bodyEncoding?: "json" | "base64" }
```

`statusCode` here is the upstream Confluence response status; the outer web trigger response is
200 for any successfully proxied call, 401 for a bad/missing secret, 400 for a malformed request.

## Commands

```bash
npm install
npm test                 # tsc --noEmit
forge deploy -e development
forge install --site <your-site>.atlassian.net --product confluence --confirm-scopes
forge variables set --encrypt -e development SYNC_SECRET <a-random-secret>
forge webtrigger -e development
```

Scopes: `read:page:confluence`, `write:page:confluence`, `read:attachment:confluence`,
`write:confluence-file` (v1 attachment upload), `read:space:confluence`.
