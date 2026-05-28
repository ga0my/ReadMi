import { getStyle, type ReaderSettings } from "./config";

const MIMO_TTS_ENDPOINT = "https://api.xiaomimimo.com/v1/chat/completions";

interface MimoTtsResponse {
  choices?: Array<{
    message?: {
      audio?: {
        data?: string;
      };
    };
  }>;
  error?: {
    message?: string;
  };
}

export function buildAssistantText(text: string, settings: ReaderSettings): string {
  const style = getStyle(settings.style);
  const tags = style.tags.length > 0 ? `(${style.tags.join(" ")})` : "";
  return `${tags}${text}`;
}

export function buildTtsRequest(text: string, settings: ReaderSettings) {
  const style = getStyle(settings.style);

  return {
    model: "mimo-v2.5-tts",
    messages: [
      {
        role: "user",
        content: style.prompt
      },
      {
        role: "assistant",
        content: buildAssistantText(text, settings)
      }
    ],
    audio: {
      format: "wav",
      voice: settings.voice
    }
  };
}

export async function synthesizeSpeech(text: string, settings: ReaderSettings, signal?: AbortSignal): Promise<string> {
  const response = await fetch(MIMO_TTS_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": settings.apiKey
    },
    signal,
    body: JSON.stringify(buildTtsRequest(text, settings))
  });

  const payload = (await response.json()) as MimoTtsResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || `MiMo TTS 请求失败：${response.status}`);
  }

  const audioData = payload.choices?.[0]?.message?.audio?.data;
  if (!audioData) {
    throw new Error("MiMo TTS 响应中没有音频数据");
  }

  return `data:audio/wav;base64,${audioData}`;
}
