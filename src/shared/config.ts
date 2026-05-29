export const RATES = [1, 1.25, 1.5, 2] as const;

export const API_ENDPOINTS = {
  tokenPlan: "https://token-plan-cn.xiaomimimo.com/v1/chat/completions",
  usage: "https://api.xiaomimimo.com/v1/chat/completions"
} as const;

export const API_MODES = [
  { label: "按量计费 API", value: "usage" },
  { label: "Token Plan", value: "tokenPlan" },
  { label: "自定义 API 地址", value: "custom" }
] as const;

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
  apiMode: "usage",
  customEndpoint: "",
  rate: 1,
  voice: "mimo_default",
  style: "mandarin_news"
} as const;

export type Rate = (typeof RATES)[number];
export type Voice = (typeof VOICES)[number]["value"];
export type Style = (typeof STYLES)[number]["value"];
export type ApiMode = (typeof API_MODES)[number]["value"];

export interface ReaderSettings {
  apiKey: string;
  apiMode: string;
  customEndpoint: string;
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
  const apiMode = API_MODES.some((item) => item.value === settings.apiMode) ? String(settings.apiMode) : DEFAULT_SETTINGS.apiMode;

  return {
    apiKey: settings.apiKey ?? DEFAULT_SETTINGS.apiKey,
    apiMode,
    customEndpoint: settings.customEndpoint ?? DEFAULT_SETTINGS.customEndpoint,
    rate,
    voice,
    style
  };
}

export function resolveTtsEndpoint(settings: Pick<ReaderSettings, "apiMode" | "customEndpoint">): string {
  if (settings.apiMode === "tokenPlan") {
    return API_ENDPOINTS.tokenPlan;
  }

  if (settings.apiMode === "custom") {
    return settings.customEndpoint.trim();
  }

  return API_ENDPOINTS.usage;
}
