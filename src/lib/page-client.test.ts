import assert from "node:assert";
import { mock, test } from "node:test";
import { isAxiosError } from "axios";
import type { Options } from "../cli.js";
import { PageClient } from "./page-client.js";
import type { RequestEnvelope } from "./webtrigger/envelope.js";

const args: Options = {
	file: "",
	user: "",
	token: "",
	pageId: "",
	attachmentId: "",
	domain: "example.atlassian.net",
	spaceId: "1",
	webtriggerUrl: "https://webtrigger.invalid/x",
	webtriggerSecret: "secret",
	title: "",
	id: "",
};

const mockProxy = (statusCode: number, body = "") => {
	const requests: RequestEnvelope[] = [];
	const fetchMock = mock.method(
		globalThis,
		"fetch",
		async (_url: string, init: RequestInit) => {
			requests.push(JSON.parse(String(init.body)));
			return new Response(
				JSON.stringify({
					statusCode,
					headers: { "content-type": "application/json" },
					body,
					bodyEncoding: "json",
				}),
				{ status: 200 },
			);
		},
	);
	return { requests, restore: () => fetchMock.mock.restore() };
};

test("deletePage sends a DELETE for the page without purging it", async () => {
	const proxy = mockProxy(204);

	const result = await new PageClient(args).deletePage("12345");
	proxy.restore();

	assert.deepStrictEqual(result, { id: "12345", deleted: true });
	assert.strictEqual(proxy.requests.length, 1);
	assert.strictEqual(proxy.requests[0].method, "DELETE");
	assert.strictEqual(proxy.requests[0].path, "/wiki/api/v2/pages/12345");
	assert.strictEqual(proxy.requests[0].query, undefined);
});

test("deletePage rejects with the API status when the page is not found", async () => {
	const proxy = mockProxy(
		404,
		JSON.stringify({ errors: [{ status: 404, title: "Not Found" }] }),
	);

	await assert.rejects(new PageClient(args).deletePage("12345"), (error) => {
		assert.ok(isAxiosError(error));
		assert.strictEqual(error.response?.status, 404);
		assert.match(error.message, /404/);
		return true;
	});
	proxy.restore();
	assert.strictEqual(proxy.requests.length, 1);
});

test("deletePage rejects with the API status when access is forbidden", async () => {
	const proxy = mockProxy(403);

	await assert.rejects(
		new PageClient(args).deletePage("12345"),
		/status code 403/,
	);
	proxy.restore();
	assert.strictEqual(proxy.requests.length, 1);
});

test("deletePage refuses a page id that is not all digits", async () => {
	const proxy = mockProxy(204);

	await assert.rejects(
		new PageClient(args).deletePage("12a45"),
		/must be all digits/,
	);
	proxy.restore();
	assert.strictEqual(proxy.requests.length, 0);
});
