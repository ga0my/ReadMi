import { describe, expect, it } from "vitest";
import { createSegments, splitLongText, splitIntoParagraphs } from "./text";

describe("text helpers", () => {
  it("splits paragraphs from article text", () => {
    expect(splitIntoParagraphs("第一段包含足够多的正文内容用于朗读。\n\n第二段也包含足够多的正文内容用于朗读。")).toEqual([
      "第一段包含足够多的正文内容用于朗读。",
      "第二段也包含足够多的正文内容用于朗读。"
    ]);
  });

  it("splits long text into bounded chunks", () => {
    const chunks = splitLongText("第一句。".repeat(180), 80);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 80)).toBe(true);
  });

  it("creates stable segment shapes", () => {
    const [segment] = createSegments(["这是一段可以朗读的正文内容。"], "test");

    expect(segment.id).toMatch(/^test-/);
    expect(segment.text).toBe("这是一段可以朗读的正文内容。");
  });
});
