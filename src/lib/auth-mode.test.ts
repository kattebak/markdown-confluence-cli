import assert from "node:assert";
import test from "node:test";
import { validateAuthMode } from "./auth-mode.js";

test("validateAuthMode accepts a complete user/token pair", () => {
	assert.doesNotThrow(() =>
		validateAuthMode({ user: "matthijs", token: "secret" }),
	);
});

test("validateAuthMode accepts a complete webtrigger pair", () => {
	assert.doesNotThrow(() =>
		validateAuthMode({
			webtriggerUrl: "https://example.invalid/x",
			webtriggerSecret: "secret",
		}),
	);
});

test("validateAuthMode rejects a user with no token", () => {
	assert.throws(() => validateAuthMode({ user: "matthijs" }), /--token/);
});

test("validateAuthMode rejects a token with no user", () => {
	assert.throws(() => validateAuthMode({ token: "secret" }), /--user/);
});

test("validateAuthMode rejects a webtriggerUrl with no webtriggerSecret", () => {
	assert.throws(
		() => validateAuthMode({ webtriggerUrl: "https://example.invalid/x" }),
		/--webtriggerSecret/,
	);
});

test("validateAuthMode rejects a webtriggerSecret with no webtriggerUrl", () => {
	assert.throws(
		() => validateAuthMode({ webtriggerSecret: "secret" }),
		/--webtriggerUrl/,
	);
});

test("validateAuthMode rejects neither pair being provided", () => {
	assert.throws(
		() => validateAuthMode({}),
		/--user.*--token.*--webtriggerUrl.*--webtriggerSecret/,
	);
});

test("validateAuthMode rejects both pairs being complete at once", () => {
	assert.throws(
		() =>
			validateAuthMode({
				user: "matthijs",
				token: "secret",
				webtriggerUrl: "https://example.invalid/x",
				webtriggerSecret: "secret",
			}),
		/exactly one auth mode/,
	);
});
