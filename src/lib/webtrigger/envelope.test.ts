import assert from "node:assert";
import test from "node:test";
import { decodeResponseEnvelope, encodeRequestEnvelope } from "./envelope.js";

test("encodeRequestEnvelope splits path and query from an absolute URL", async () => {
	const envelope = await encodeRequestEnvelope({
		url: "https://example.atlassian.net/wiki/api/v2/pages?title=Foo&spaceId=1",
		method: "get",
		headers: { accept: "application/json" },
		data: undefined,
	});

	assert.strictEqual(envelope.method, "GET");
	assert.strictEqual(envelope.path, "/wiki/api/v2/pages");
	assert.strictEqual(envelope.query, "title=Foo&spaceId=1");
	assert.strictEqual(envelope.body, undefined);
	assert.deepStrictEqual(envelope.headers, { accept: "application/json" });
});

test("encodeRequestEnvelope rejects a non-wiki path", async () => {
	await assert.rejects(
		encodeRequestEnvelope({
			url: "https://example.atlassian.net/rest/api/other",
			method: "get",
			headers: {},
			data: undefined,
		}),
		/Refusing to proxy a non-wiki path/,
	);
});

test("encodeRequestEnvelope carries a JSON string body as-is", async () => {
	const envelope = await encodeRequestEnvelope({
		url: "https://example.atlassian.net/wiki/api/v2/pages",
		method: "post",
		headers: { "content-type": "application/json" },
		data: JSON.stringify({ title: "Foo" }),
	});

	assert.strictEqual(envelope.bodyEncoding, "json");
	assert.strictEqual(envelope.body, JSON.stringify({ title: "Foo" }));
});

test("encodeRequestEnvelope base64-encodes a multipart FormData body with its boundary header", async () => {
	const form = new FormData();
	form.append("file", new Blob(["hello"], { type: "text/plain" }), "hello.txt");

	const envelope = await encodeRequestEnvelope({
		url: "https://example.atlassian.net/wiki/rest/api/content/1/child/attachment",
		method: "put",
		headers: {},
		data: form,
	});

	assert.strictEqual(envelope.bodyEncoding, "base64");
	assert.ok(
		envelope.headers?.["content-type"]?.startsWith(
			"multipart/form-data; boundary=",
		),
	);

	const decoded = Buffer.from(envelope.body ?? "", "base64").toString("utf8");
	assert.ok(decoded.includes("hello.txt"));
	assert.ok(decoded.includes("hello"));
});

test("encodeRequestEnvelope replaces a differently-cased Content-Type header instead of duplicating it", async () => {
	const form = new FormData();
	form.append("file", new Blob(["hello"], { type: "text/plain" }), "hello.txt");

	const envelope = await encodeRequestEnvelope({
		url: "https://example.atlassian.net/wiki/rest/api/content/1/child/attachment",
		method: "put",
		headers: { "Content-Type": "multipart/form-data" },
		data: form,
	});

	const headerKeys = Object.keys(envelope.headers ?? {}).map((key) =>
		key.toLowerCase(),
	);
	assert.strictEqual(
		headerKeys.filter((key) => key === "content-type").length,
		1,
	);
	assert.ok(
		envelope.headers?.["content-type"]?.startsWith(
			"multipart/form-data; boundary=",
		),
	);
});

test("decodeResponseEnvelope returns the raw text body for a json envelope", () => {
	const decoded = decodeResponseEnvelope({
		statusCode: 200,
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ id: "123" }),
		bodyEncoding: "json",
	});

	assert.strictEqual(decoded.status, 200);
	assert.strictEqual(decoded.data, JSON.stringify({ id: "123" }));
});

test("decodeResponseEnvelope decodes a base64 envelope into a Buffer", () => {
	const decoded = decodeResponseEnvelope({
		statusCode: 200,
		body: Buffer.from("binary-data").toString("base64"),
		bodyEncoding: "base64",
	});

	assert.ok(Buffer.isBuffer(decoded.data));
	assert.strictEqual((decoded.data as Buffer).toString("utf8"), "binary-data");
});
