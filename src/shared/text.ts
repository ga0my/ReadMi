export interface TextSegment {
  id: string;
  text: string;
}

const MAX_SEGMENT_LENGTH = 450;
const MIN_SEGMENT_LENGTH = 12;

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
