import { strict as assert } from "node:assert";
import { extractReplyText, replyRefusal } from "./replyText.ts";

Deno.test("extracts plain string content", () => {
  assert.equal(
    extractReplyText({ message: { content: "hello", role: "assistant" } }),
    "hello",
  );
});

Deno.test("joins text blocks from structured content", () => {
  assert.equal(
    extractReplyText({
      message: {
        content: [
          { type: "text", text: "part one." },
          { type: "text", text: "part two." },
        ],
      },
    }),
    "part one.\npart two.",
  );
});

Deno.test("extracts nested text objects", () => {
  assert.equal(
    extractReplyText({ message: { content: { text: "nested" } } }),
    "nested",
  );
});

Deno.test("returns null when no text is present", () => {
  assert.equal(extractReplyText({ message: { content: "" } }), null);
  assert.equal(extractReplyText({ message: { content: [] } }), null);
  assert.equal(extractReplyText({ message: {} }), null);
  assert.equal(extractReplyText(null), null);
});

Deno.test("reads refusal text when present", () => {
  assert.equal(
    replyRefusal({ message: { refusal: "I cannot help.", content: "" } }),
    "I cannot help.",
  );
  assert.equal(
    replyRefusal({ message: { content: "fine" } }),
    null,
  );
});
