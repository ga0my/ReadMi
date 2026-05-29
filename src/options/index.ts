import { DEFAULT_SETTINGS } from "../shared/config";
import { clearApiKey, getSettings, saveSettings } from "../shared/storage";
import { synthesizeSpeech } from "../shared/tts";
import "./style.css";

const apiModeSelect = document.querySelector<HTMLSelectElement>("#apiMode")!;
const customEndpointField = document.querySelector<HTMLDivElement>("#customEndpointField")!;
const customEndpointInput = document.querySelector<HTMLInputElement>("#customEndpoint")!;
const apiKeyInput = document.querySelector<HTMLInputElement>("#apiKey")!;
const message = document.querySelector<HTMLParagraphElement>("#message")!;

document.querySelector("#saveKey")?.addEventListener("click", () => {
  void saveApiSettings();
});

document.querySelector("#clearKey")?.addEventListener("click", () => {
  void clearApiKey().then(() => {
    apiKeyInput.value = "";
    message.textContent = "已清除 API Key";
  });
});

document.querySelector("#testApi")?.addEventListener("click", () => {
  void testApiSettings();
});

apiModeSelect.addEventListener("change", () => {
  renderEndpointField();
});

void initialize();

async function initialize() {
  const settings = await getSettings();
  apiModeSelect.value = settings.apiMode;
  customEndpointInput.value = settings.customEndpoint;
  apiKeyInput.value = settings.apiKey;
  renderEndpointField();
}

async function saveApiSettings() {
  const draft = readDraftSettings();
  if (!draft) {
    return;
  }

  await saveSettings(draft);
  message.textContent = "已保存";
}

async function testApiSettings() {
  const draft = readDraftSettings();
  if (!draft) {
    return;
  }

  const settings = await saveSettings(draft);
  message.textContent = "正在测试...";

  try {
    await synthesizeSpeech("测试", { ...DEFAULT_SETTINGS, ...settings });
    message.textContent = "测试成功，API 配置可用";
  } catch (error) {
    message.textContent = error instanceof Error ? `测试失败：${error.message}` : "测试失败";
  }
}

function readDraftSettings() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    message.textContent = "请输入 API Key";
    return null;
  }

  const apiMode = apiModeSelect.value;
  const customEndpoint = customEndpointInput.value.trim();

  if (apiMode === "custom" && !customEndpoint) {
    message.textContent = "请输入自定义 API 地址";
    return null;
  }

  if (apiMode === "custom" && !isValidUrl(customEndpoint)) {
    message.textContent = "请输入有效的自定义 API 地址";
    return null;
  }

  return {
    apiKey,
    apiMode,
    customEndpoint
  };
}

function renderEndpointField() {
  customEndpointField.classList.toggle("hidden", apiModeSelect.value !== "custom");
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
