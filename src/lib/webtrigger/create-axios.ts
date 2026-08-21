import assert from "node:assert";
import axios, { type AxiosInstance } from "axios";
import { createWebTriggerAdapter } from "./adapter.js";

export interface WebTriggerArgs {
	webtriggerUrl?: string;
	webtriggerSecret?: string;
}

export const createWebTriggerAxios = (
	args: WebTriggerArgs,
): AxiosInstance | undefined => {
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

	return axios.create({
		adapter: createWebTriggerAdapter(args.webtriggerUrl, args.webtriggerSecret),
	});
};
