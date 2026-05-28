export const RATES = [1, 1.25, 1.5, 2] as const;

export const VOICES = [
  { label: "默认", value: "mimo_default" },
  { label: "冰糖", value: "冰糖" },
  { label: "茉莉", value: "茉莉" },
  { label: "苏打", value: "苏打" },
  { label: "白桦", value: "白桦" }
] as const;

export const STYLES = [
  {
    label: "普通话，新闻播报",
    value: "mandarin_news",
    prompt: "普通话，新闻播报，清晰稳重，自然流畅",
    tags: ["新闻播报"]
  },
  {
    label: "音色定位：磁性",
    value: "voice_magnetic",
    prompt: "普通话，磁性音色，语速适中，清晰自然",
    tags: ["磁性"]
  },
  {
    label: "人设腔调：温柔讲述",
    value: "persona_warm",
    prompt: "普通话，温柔讲述，亲和自然，适合长文阅读",
    tags: ["温柔"]
  },
  {
    label: "角色扮演：主持人",
    value: "role_host",
    prompt: "普通话，主持人口吻，表达清楚，有节奏感",
    tags: ["主持人"]
  },
  {
    label: "方言：四川话",
    value: "dialect_sichuan",
    prompt: "四川话，轻松自然，适合口语化阅读",
    tags: ["四川话"]
  }
] as const;

export const DEFAULT_SETTINGS = {
  apiKey: "",
  rate: 1,
  voice: "mimo_default",
  style: "mandarin_news"
} as const;

export type Rate = (typeof RATES)[number];
export type Voice = (typeof VOICES)[number]["value"];
export type Style = (typeof STYLES)[number]["value"];

export interface ReaderSettings {
  apiKey: string;
  rate: number;
  voice: string;
  style: string;
}

export function getStyle(value: string) {
  return STYLES.find((style) => style.value === value) ?? STYLES[0];
}

export function normalizeSettings(settings: Partial<ReaderSettings>): ReaderSettings {
  const rate = RATES.includes(settings.rate as Rate) ? Number(settings.rate) : DEFAULT_SETTINGS.rate;
  const voice = VOICES.some((item) => item.value === settings.voice) ? String(settings.voice) : DEFAULT_SETTINGS.voice;
  const style = STYLES.some((item) => item.value === settings.style) ? String(settings.style) : DEFAULT_SETTINGS.style;

  return {
    apiKey: settings.apiKey ?? DEFAULT_SETTINGS.apiKey,
    rate,
    voice,
    style
  };
}
