import { describe, expect, it } from "vitest";
import { API_ENDPOINTS, normalizeSettings, resolveTtsEndpoint } from "./config";

describe("settings", () => {
  it("uses defaults for invalid values", () => {
    expect(normalizeSettings({ rate: 3, voice: "bad", style: "bad" })).toMatchObject({
      apiMode: "usage",
      rate: 1,
      voice: "mimo_default",
      style: "mandarin_news"
    });
  });

  it("keeps supported playback rates", () => {
    expect(normalizeSettings({ rate: 1.5 }).rate).toBe(1.5);
  });

  it("resolves configured API endpoints", () => {
    expect(resolveTtsEndpoint({ apiMode: "usage", customEndpoint: "" })).toBe(API_ENDPOINTS.usage);
    expect(resolveTtsEndpoint({ apiMode: "tokenPlan", customEndpoint: "" })).toBe(API_ENDPOINTS.tokenPlan);
    expect(resolveTtsEndpoint({ apiMode: "custom", customEndpoint: "https://example.com/v1/chat/completions" })).toBe(
      "https://example.com/v1/chat/completions"
    );
  });
});
