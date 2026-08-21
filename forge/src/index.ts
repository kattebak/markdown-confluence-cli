import api, {
	assumeTrustedRoute,
	type APIResponse,
	type WebTriggerRequest,
	type WebTriggerResponse,
} from "@forge/api";

interface RequestEnvelope {
	method: string;
	path: string;
	query?: string;
	headers?: Record<string, string>;
	body?: string;
	bodyEncoding?: "json" | "base64";
}

interface ResponseEnvelope {
	statusCode: number;
	headers?: Record<string, string>;
	body?: string;
	bodyEncoding?: "json" | "base64";
}

const jsonResponse = (statusCode: number, body: unknown): WebTriggerResponse => ({
	statusCode,
	headers: { "content-type": ["application/json"] },
	body: JSON.stringify(body),
});

const firstHeader = (headers: Record<string, string[]>, name: string): string | undefined => {
	const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name);
	return key ? headers[key]?.[0] : undefined;
};

interface RequestConfluenceInit {
	method: string;
	headers: Record<string, string>;
	body?: string | ArrayBuffer;
}

const toRequestInit = (envelope: RequestEnvelope): RequestConfluenceInit => {
	const init: RequestConfluenceInit = {
		method: envelope.method,
		headers: envelope.headers ?? {},
	};

	if (envelope.body === undefined) {
		return init;
	}

	if (envelope.bodyEncoding === "base64") {
		const buffer = Buffer.from(envelope.body, "base64");
		init.body = buffer.buffer.slice(
			buffer.byteOffset,
			buffer.byteOffset + buffer.byteLength,
		) as ArrayBuffer;
		return init;
	}

	init.body = envelope.body;
	return init;
};

const toResponseEnvelope = async (response: APIResponse): Promise<ResponseEnvelope> => {
	const headers: Record<string, string> = {};
	response.headers.forEach((value, key) => {
		headers[key] = value;
	});

	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("json") || contentType.startsWith("text/")) {
		return {
			statusCode: response.status,
			headers,
			body: await response.text(),
			bodyEncoding: "json",
		};
	}

	const buffer = Buffer.from(await response.arrayBuffer());
	return {
		statusCode: response.status,
		headers,
		body: buffer.toString("base64"),
		bodyEncoding: "base64",
	};
};

export const handler = async (request: WebTriggerRequest): Promise<WebTriggerResponse> => {
	const providedSecret = firstHeader(request.headers, "x-sync-secret");

	if (!providedSecret || providedSecret !== process.env.SYNC_SECRET) {
		return jsonResponse(401, { error: "Invalid or missing x-sync-secret header" });
	}

	let envelope: RequestEnvelope;
	try {
		envelope = JSON.parse(request.body ?? "");
	} catch {
		return jsonResponse(400, { error: "Request body must be JSON" });
	}

	if (!envelope.path?.startsWith("/wiki/")) {
		return jsonResponse(400, { error: "path must start with /wiki/" });
	}

	const target = envelope.query ? `${envelope.path}?${envelope.query}` : envelope.path;
	const response = await api
		.asApp()
		.requestConfluence(assumeTrustedRoute(target), toRequestInit(envelope));
	const responseEnvelope = await toResponseEnvelope(response);

	return jsonResponse(200, responseEnvelope);
};
