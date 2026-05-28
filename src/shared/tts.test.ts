import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./config";
import { buildAssistantText, buildTtsRequest } from "./tts";

describe("tts request", () => {
  it("builds the MiMo request body", () => {
    const request = buildTtsRequest("你好，世界。", { ...DEFAULT_SETTINGS, apiKey: "key" });

    expect(request.model).toBe("mimo-v2.5-tts");
    expect(request.audio).toEqual({ format: "wav", voice: "mimo_default" });
    expect(request.messages[1]).toEqual({
      role: "assistant",
      content: "(新闻播报)你好，世界。"
    });
  });

  it("adds selected style tags to assistant text", () => {
    expect(buildAssistantText("正文", { ...DEFAULT_SETTINGS, style: "dialect_sichuan" })).toBe("(四川话)正文");
  });
});
