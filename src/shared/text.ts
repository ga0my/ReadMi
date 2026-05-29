export interface TextSegment {
  id: string;
  text: string;
}

const MAX_SEGMENT_LENGTH = 450;
const MIN_SEGMENT_LENGTH = 12;
const FIRST_SEGMENT_SPLIT_THRESHOLD = 20;
const LONG_FIRST_SENTENCE_THRESHOLD = 80;

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|(?<=。|！|？|\?|!|\.)\s+/)
    .map(normalizeText)
    .filter((item) => item.length >= MIN_SEGMENT_LENGTH);
}

export function splitLongText(text: string, maxLength = MAX_SEGMENT_LENGTH): string[] {
  const normalized = normalizeText(text);

  if (normalized.length <= maxLength) {
    return normalized ? [normalized] : [];
  }

  const sentences = normalized
    .split(/(?<=[。！？!?；;：:，,\.])\s*/)
    .map(normalizeText)
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }

    if ((current + sentence).length <= maxLength) {
      current += sentence;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.flatMap((chunk) => hardSplit(chunk, maxLength));
}

export function optimizeInitialSegments(texts: string[]): string[] {
  const normalizedTexts = texts.map(normalizeText).filter(Boolean);
  const [firstText, ...restTexts] = normalizedTexts;

  if (!firstText || firstText.length <= FIRST_SEGMENT_SPLIT_THRESHOLD) {
    return normalizedTexts;
  }

  const [leadText, remainingText] = splitFirstReadableSentence(firstText);
  if (!leadText || !remainingText) {
    return normalizedTexts;
  }

  return [leadText, remainingText, ...restTexts];
}

export function createSegments(texts: string[], prefix = "segment"): TextSegment[] {
  let index = 0;

  return texts.flatMap((text) =>
    splitLongText(text).map((chunk) => {
      index += 1;
      return {
        id: `${prefix}-${Date.now()}-${index}`,
        text: chunk
      };
    })
  );
}

export function findSegmentIndexBySelectionStart(segments: TextSegment[], selectedText: string): number {
  return findSegmentSelectionStartMatch(segments, selectedText)?.index ?? 0;
}

export function sliceSegmentsFromSelectionStart(segments: TextSegment[], selectedText: string): TextSegment[] {
  const match = findSegmentSelectionStartMatch(segments, selectedText);
  if (!match) {
    return segments;
  }

  const currentSegment = segments[match.index];
  const currentText = normalizeText(currentSegment.text.slice(match.offset));
  const remainingSegments = segments.slice(match.index + 1);

  if (!currentText) {
    return remainingSegments;
  }

  return [{ ...currentSegment, text: currentText }, ...remainingSegments];
}

function findSegmentSelectionStartMatch(segments: TextSegment[], selectedText: string): { index: number; offset: number } | null {
  const needle = normalizeText(selectedText);
  if (!needle) {
    return null;
  }

  for (const prefix of getSelectionStartPrefixes(needle)) {
    const index = segments.findIndex((segment) => segment.text.includes(prefix));
    if (index >= 0) {
      return {
        index,
        offset: segments[index].text.indexOf(prefix)
      };
    }
  }

  return null;
}

function hardSplit(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += maxLength) {
    chunks.push(text.slice(index, index + maxLength));
  }
  return chunks;
}

function getSelectionStartPrefixes(text: string): string[] {
  const lengths = [80, 48, 24, 12, 6];
  const prefixes = lengths.map((length) => text.slice(0, length)).filter((prefix) => prefix.length > 0);
  return Array.from(new Set(prefixes));
}

function splitFirstReadableSentence(text: string): [string, string] {
  const sentenceMatch = text.match(/^.+?[。！？!?；;\n]/);
  const firstSentence = normalizeText(sentenceMatch?.[0] ?? text);

  if (firstSentence.length <= LONG_FIRST_SENTENCE_THRESHOLD) {
    return [firstSentence, normalizeText(text.slice(firstSentence.length))];
  }

  const clauseMatch = firstSentence.match(/^.+?[，,、：:]/);
  if (clauseMatch?.[0]) {
    const clause = normalizeText(clauseMatch[0]);
    return [clause, normalizeText(text.slice(clause.length))];
  }

  const leadText = firstSentence.slice(0, LONG_FIRST_SENTENCE_THRESHOLD);
  return [leadText, normalizeText(text.slice(leadText.length))];
}
