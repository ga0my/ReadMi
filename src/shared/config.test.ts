import { describe, expect, it } from "vitest";
import { normalizeSettings } from "./config";

describe("settings", () => {
  it("uses defaults for invalid values", () => {
    expect(normalizeSettings({ rate: 3, voice: "bad", style: "bad" })).toMatchObject({
      rate: 1,
      voice: "mimo_default",
      style: "mandarin_news"
    });
  });

  it("keeps supported playback rates", () => {
    expect(normalizeSettings({ rate: 1.5 }).rate).toBe(1.5);
  });
});
