import assert from "node:assert";

export interface RequestEnvelope {
	method: string;
	path: string;
	query?: string;
	headers?: Record<string, string>;
	body?: string;
	bodyEncoding?: "json" | "base64";
}

export interface ResponseEnvelope {
	statusCode: number;
	headers?: Record<string, string>;
	body?: string;
	bodyEncoding?: "json" | "base64";
}

export interface DecodedResponse {
	status: number;
	headers: Record<string, string>;
	data: unknown;
}

export const encodeRequestEnvelope = async (params: {
	url: string;
	method: string;
	headers: Record<string, string>;
	data: unknown;
}): Promise<RequestEnvelope> => {
	const target = new URL(params.url);
	assert(
		target.pathname.startsWith("/wiki/"),
		`Refusing to proxy a non-wiki path: ${target.pathname}`,
	);

	const envelope: RequestEnvelope = {
		method: params.method.toUpperCase(),
		path: target.pathname,
		query: target.search ? target.search.slice(1) : undefined,
		headers: params.headers,
	};

	if (typeof FormData !== "undefined" && params.data instanceof FormData) {
		const encoded = new Request("https://webtrigger.invalid/", {
			method: "POST",
			body: params.data,
		});
		const contentType = encoded.headers.get("content-type");

		envelope.headers = contentType
			? { ...envelope.headers, "content-type": contentType }
			: envelope.headers;
		envelope.body = Buffer.from(await encoded.arrayBuffer()).toString("base64");
		envelope.bodyEncoding = "base64";
		return envelope;
	}

	if (typeof params.data === "string") {
		envelope.body = params.data;
		envelope.bodyEncoding = "json";
	}

	return envelope;
};

export const decodeResponseEnvelope = (
	envelope: ResponseEnvelope,
): DecodedResponse => {
	const headers = envelope.headers ?? {};
	const body = envelope.body ?? "";

	if (envelope.bodyEncoding === "base64") {
		return {
			status: envelope.statusCode,
			headers,
			data: Buffer.from(body, "base64"),
		};
	}

	return { status: envelope.statusCode, headers, data: body };
};
