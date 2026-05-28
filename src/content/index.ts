import { Readability } from "@mozilla/readability";
import type { ContentMessage, ExtractResult } from "../shared/messages";
import { createSegments, normalizeText, splitIntoParagraphs, type TextSegment } from "../shared/text";

const HIGHLIGHT_CLASS = "readmi-highlight";
const STYLE_ID = "readmi-highlight-style";

const segmentTexts = new Map<string, string>();
let selectionRange: Range | null = null;

chrome.runtime.onMessage.addListener((message: ContentMessage, _sender, sendResponse) => {
  try {
    if (message.type === "EXTRACT_TEXT") {
      sendResponse(extractText(message.mode));
    } else if (message.type === "HIGHLIGHT_SEGMENT") {
      highlightSegment(message.segmentId);
      sendResponse({ ok: true });
    } else if (message.type === "CLEAR_HIGHLIGHT") {
      clearHighlight();
      sendResponse({ ok: true });
    }
  } catch (error) {
    sendResponse({
      segments: [],
      error: error instanceof Error ? error.message : "页面内容提取失败"
    });
  }
});

function extractText(mode: "full" | "selection" | "from-selection"): ExtractResult {
  clearHighlight();
  segmentTexts.clear();
  selectionRange = null;

  if (mode === "selection") {
    const selected = getSelectionText();
    if (!selected.text) {
      return { segments: [] };
    }

    selectionRange = selected.range;
    const segments = createSegments([selected.text], "selection");
    rememberSegments(segments);
    return { segments };
  }

  const paragraphs = extractArticleParagraphs();
  let segments = createSegments(paragraphs, "article");

  if (mode === "from-selection") {
    const selected = getSelectionText();
    const selectedText = selected.text;
    selectionRange = selected.range;
    const startIndex = selectedText ? findStartSegmentIndex(segments, selectedText) : 0;
    segments = segments.slice(startIndex);
  }

  rememberSegments(segments);
  return { segments };
}

function extractArticleParagraphs(): string[] {
  const clone = document.cloneNode(true) as Document;
  const article = new Readability(clone).parse();
  const fromReadability = article?.content ? htmlToParagraphs(article.content) : [];

  if (fromReadability.length > 0) {
    return fromReadability;
  }

  return splitIntoParagraphs(document.body?.innerText ?? "");
}

function htmlToParagraphs(html: string): string[] {
  const template = document.createElement("template");
  template.innerHTML = html;
  const nodes = Array.from(template.content.querySelectorAll("p, h1, h2, h3, li, blockquote"));
  const texts = nodes.map((node) => normalizeText(node.textContent ?? "")).filter(Boolean);

  if (texts.length > 0) {
    return texts;
  }

  return splitIntoParagraphs(template.content.textContent ?? "");
}

function getSelectionText(): { text: string; range: Range | null } {
  const selection = window.getSelection();
  const text = normalizeText(selection?.toString() ?? "");
  const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
  return { text, range };
}

function findStartSegmentIndex(segments: TextSegment[], selectedText: string): number {
  const needle = normalizeText(selectedText).slice(0, 80);
  if (!needle) {
    return 0;
  }

  const exactIndex = segments.findIndex((segment) => segment.text.includes(needle) || needle.includes(segment.text.slice(0, 80)));
  if (exactIndex >= 0) {
    return exactIndex;
  }

  const shorterNeedle = needle.slice(0, 24);
  const looseIndex = segments.findIndex((segment) => segment.text.includes(shorterNeedle));
  return looseIndex >= 0 ? looseIndex : 0;
}

function rememberSegments(segments: TextSegment[]) {
  for (const segment of segments) {
    segmentTexts.set(segment.id, segment.text);
  }
}

function highlightSegment(segmentId: string) {
  clearHighlight();
  ensureStyle();

  if (segmentId.startsWith("selection") && selectionRange) {
    wrapRange(selectionRange);
    return;
  }

  const text = segmentTexts.get(segmentId);
  if (!text) {
    return;
  }

  const range = findTextRange(text);
  if (range) {
    wrapRange(range);
  }
}

function findTextRange(text: string): Range | null {
  const needle = normalizeText(text).slice(0, 120);
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return normalizeText(node.textContent ?? "").includes(needle.slice(0, 30))
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    }
  });

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const raw = node.textContent ?? "";
    const compactRaw = normalizeText(raw);
    const startInNormalized = compactRaw.indexOf(needle.slice(0, Math.min(needle.length, 60)));

    if (startInNormalized >= 0) {
      const rawStart = raw.indexOf(needle.slice(0, 10).trim());
      if (rawStart >= 0) {
        const range = document.createRange();
        range.setStart(node, rawStart);
        range.setEnd(node, Math.min(raw.length, rawStart + Math.min(text.length, raw.length - rawStart)));
        return range;
      }
    }
  }

  return null;
}

function wrapRange(range: Range) {
  try {
    const span = document.createElement("span");
    span.className = HIGHLIGHT_CLASS;
    const contents = range.cloneRange().extractContents();
    span.append(contents);
    range.insertNode(span);
    span.scrollIntoView({ block: "center", behavior: "smooth" });
  } catch {
    const parent = range.commonAncestorContainer.parentElement;
    parent?.classList.add(HIGHLIGHT_CLASS);
    parent?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function clearHighlight() {
  for (const node of Array.from(document.querySelectorAll(`span.${HIGHLIGHT_CLASS}`))) {
    const parent = node.parentNode;
    if (!parent) {
      continue;
    }

    while (node.firstChild) {
      parent.insertBefore(node.firstChild, node);
    }
    parent.removeChild(node);
    parent.normalize();
  }

  for (const node of Array.from(document.querySelectorAll(`.${HIGHLIGHT_CLASS}`))) {
    node.classList.remove(HIGHLIGHT_CLASS);
  }
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      background: rgba(255, 214, 10, 0.42) !important;
      box-shadow: 0 0 0 2px rgba(255, 214, 10, 0.28) !important;
      border-radius: 3px !important;
      transition: background 160ms ease !important;
    }
  `;
  document.documentElement.append(style);
}
