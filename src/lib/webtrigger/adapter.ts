import assert from "node:assert";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { AxiosHeaders } from "axios";
import {
	decodeResponseEnvelope,
	encodeRequestEnvelope,
	type ResponseEnvelope,
} from "./envelope.js";

const toHeaderRecord = (
	headers: InternalAxiosRequestConfig["headers"],
): Record<string, string> => {
	if (headers instanceof AxiosHeaders) {
		const record: Record<string, string> = {};
		for (const [key, value] of Object.entries(headers.toJSON())) {
			if (typeof value === "string") record[key] = value;
		}
		return record;
	}

	return (headers as Record<string, string> | undefined) ?? {};
};

export const createWebTriggerAdapter = (
	webtriggerUrl: string,
	secret: string,
): AxiosAdapter => {
	return async (config: InternalAxiosRequestConfig) => {
		assert(config.url, "Missing request URL");

		const envelope = await encodeRequestEnvelope({
			url: config.url,
			method: config.method ?? "get",
			headers: toHeaderRecord(config.headers),
			data: config.data,
		});

		const response = await fetch(webtriggerUrl, {
			method: "POST",
			headers: { "content-type": "application/json", "x-sync-secret": secret },
			body: JSON.stringify(envelope),
		});

		assert(
			response.ok,
			`Web trigger proxy request failed: ${response.status} ${response.statusText}`,
		);

		const responseEnvelope = (await response.json()) as ResponseEnvelope;
		const decoded = decodeResponseEnvelope(responseEnvelope);

		return {
			data: decoded.data,
			status: decoded.status,
			statusText: "",
			headers: decoded.headers,
			config,
			request: undefined,
		};
	};
};
