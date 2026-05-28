import { DEFAULT_SETTINGS, type ReaderSettings, normalizeSettings } from "./config";

const SETTINGS_KEY = "readmi.settings";

export async function getSettings(): Promise<ReaderSettings> {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings({ ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] ?? {}) });
}

export async function saveSettings(settings: Partial<ReaderSettings>): Promise<ReaderSettings> {
  const current = await getSettings();
  const next = normalizeSettings({ ...current, ...settings });
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function clearApiKey(): Promise<ReaderSettings> {
  return saveSettings({ apiKey: "" });
}
