import assert from "node:assert";
import type { BaseAPI } from "@kattebak/confluence-axios-client-v1/dist/base.js";
import axios from "axios";
import { createWebTriggerAdapter } from "./adapter.js";

type ClientAxiosInstance = NonNullable<
	ConstructorParameters<typeof BaseAPI>[2]
>;

export interface WebTriggerArgs {
	webtriggerUrl?: string;
	webtriggerSecret?: string;
}

export const createWebTriggerAxios = (
	args: WebTriggerArgs,
): ClientAxiosInstance | undefined => {
	if (!args.webtriggerUrl && !args.webtriggerSecret) {
		return undefined;
	}

	assert(
		args.webtriggerUrl,
		"--webtrigger-url is required when --webtrigger-secret is set",
	);
	assert(
		args.webtriggerSecret,
		"--webtrigger-secret is required when --webtrigger-url is set",
	);

	const instance: unknown = axios.create({
		adapter: createWebTriggerAdapter(args.webtriggerUrl, args.webtriggerSecret),
	});
	// The generated clients are CommonJS, so their AxiosInstance comes from axios'
	// CJS typings, whose unique symbols differ from the ESM copy since axios 1.19.
	return instance as ClientAxiosInstance;
};
