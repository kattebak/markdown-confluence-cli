import { AssertionError } from "node:assert";

export interface AuthModeOptions {
	user?: string;
	token?: string;
	webtriggerUrl?: string;
	webtriggerSecret?: string;
}

export function validateAuthMode(options: AuthModeOptions): void {
	const hasUser = Boolean(options.user);
	const hasToken = Boolean(options.token);
	const hasWebtriggerUrl = Boolean(options.webtriggerUrl);
	const hasWebtriggerSecret = Boolean(options.webtriggerSecret);

	const userTokenComplete = hasUser && hasToken;
	const webtriggerComplete = hasWebtriggerUrl && hasWebtriggerSecret;

	if (userTokenComplete !== webtriggerComplete) return;

	if (hasUser || hasToken || hasWebtriggerUrl || hasWebtriggerSecret) {
		const missing: string[] = [];
		if (hasUser && !hasToken) missing.push("--token");
		if (hasToken && !hasUser) missing.push("--user");
		if (hasWebtriggerUrl && !hasWebtriggerSecret)
			missing.push("--webtriggerSecret");
		if (hasWebtriggerSecret && !hasWebtriggerUrl)
			missing.push("--webtriggerUrl");

		if (missing.length > 0) {
			throw new AssertionError({
				message: `Missing required option(s): ${missing.join(", ")}`,
			});
		}

		throw new AssertionError({
			message:
				"Provide exactly one auth mode: --user and --token, or --webtriggerUrl and --webtriggerSecret",
		});
	}

	throw new AssertionError({
		message:
			"Missing auth options. Provide --user and --token, or --webtriggerUrl and --webtriggerSecret",
	});
}
