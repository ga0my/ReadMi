import { describe, expect, it } from "vitest";
import {
  createSegments,
  findSegmentIndexBySelectionStart,
  optimizeInitialSegments,
  sliceSegmentsFromSelectionStart,
  splitLongText,
  splitIntoParagraphs
} from "./text";

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

  it("splits the first article segment into a fast startup sentence", () => {
    expect(optimizeInitialSegments(["这是第一句，用来快速开始播放。这里是第一段剩余内容，会在后续继续朗读。", "第二段正文内容。"])).toEqual([
      "这是第一句，用来快速开始播放。",
      "这里是第一段剩余内容，会在后续继续朗读。",
      "第二段正文内容。"
    ]);
  });

  it("keeps short first segments unchanged", () => {
    expect(optimizeInitialSegments(["短标题。", "第二段正文内容。"])).toEqual(["短标题。", "第二段正文内容。"]);
  });

  it("falls back to a shorter lead when the first sentence is too long", () => {
    const longOpening = "里面包含很多铺垫内容用于模拟真实文章的长导语并减少首次语音合成等待时间";
    const [leadText, remainingText] = optimizeInitialSegments([
      `这是一个非常长的开头句子，${longOpening}${longOpening}。这里是后续正文。`
    ]);

    expect(leadText).toBe("这是一个非常长的开头句子，");
    expect(remainingText).toBe(`${longOpening}${longOpening}。这里是后续正文。`);
  });

  it("finds the segment that contains the selection start after optimizing the first paragraph", () => {
    const segments = createSegments(optimizeInitialSegments(["这是第一句，用来快速开始播放。这里是第一段剩余内容，会在后续继续朗读。"]), "article");

    expect(findSegmentIndexBySelectionStart(segments, "第一段剩余内容，会在后续继续朗读。")).toBe(1);
  });

  it("starts inside the matched segment when reading from a selection", () => {
    const segments = createSegments(optimizeInitialSegments(["这是第一句，用来快速开始播放。这里是第一段剩余内容，会在后续继续朗读。"]), "article");
    const [firstSegment] = sliceSegmentsFromSelectionStart(segments, "后续继续朗读。");

    expect(firstSegment.text).toBe("后续继续朗读。");
  });

  it("creates stable segment shapes", () => {
    const [segment] = createSegments(["这是一段可以朗读的正文内容。"], "test");

    expect(segment.id).toMatch(/^test-/);
    expect(segment.text).toBe("这是一段可以朗读的正文内容。");
  });
});
