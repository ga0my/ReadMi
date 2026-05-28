import { clearApiKey, getSettings, saveSettings } from "../shared/storage";
import "./style.css";

const apiKeyInput = document.querySelector<HTMLInputElement>("#apiKey")!;
const message = document.querySelector<HTMLParagraphElement>("#message")!;

document.querySelector("#saveKey")?.addEventListener("click", () => {
  void saveApiKey();
});

document.querySelector("#clearKey")?.addEventListener("click", () => {
  void clearApiKey().then(() => {
    apiKeyInput.value = "";
    message.textContent = "已清除 API Key";
  });
});

void initialize();

async function initialize() {
  const settings = await getSettings();
  apiKeyInput.value = settings.apiKey;
}

async function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    message.textContent = "请输入 API Key";
    return;
  }

  await saveSettings({ apiKey });
  message.textContent = "已保存";
}
