import assert from "node:assert";
import type {
	AxiosAdapter,
	AxiosResponse,
	InternalAxiosRequestConfig,
} from "axios";
import { AxiosError, AxiosHeaders } from "axios";
import {
	decodeResponseEnvelope,
	encodeRequestEnvelope,
	type ResponseEnvelope,
} from "./envelope.js";

const toHeaderRecord = (
	headers: InternalAxiosRequestConfig["headers"],
): Record<string, string> => {
	const source: Record<string, unknown> =
		headers instanceof AxiosHeaders
			? headers.toJSON()
			: ((headers as Record<string, unknown> | undefined) ?? {});

	const record: Record<string, string> = {};
	for (const [key, value] of Object.entries(source)) {
		if (typeof value === "string") record[key.toLowerCase()] = value;
	}
	return record;
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

		const result: AxiosResponse = {
			data: decoded.data,
			status: decoded.status,
			statusText: "",
			headers: decoded.headers,
			config,
			request: undefined,
		};

		if (config.validateStatus && !config.validateStatus(result.status)) {
			throw new AxiosError(
				`Request failed with status code ${result.status}`,
				result.status >= 500
					? AxiosError.ERR_BAD_RESPONSE
					: AxiosError.ERR_BAD_REQUEST,
				config,
				undefined,
				result,
			);
		}

		return result;
	};
};
