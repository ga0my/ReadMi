import { RATES, STYLES, VOICES } from "../shared/config";
import type { ReaderState, RuntimeMessage } from "../shared/messages";
import { getSettings, saveSettings } from "../shared/storage";
import "./style.css";

const statusText = document.querySelector<HTMLParagraphElement>("#statusText")!;
const logoMark = document.querySelector<HTMLDivElement>("#logoMark")!;
const voiceSelect = document.querySelector<HTMLSelectElement>("#voiceSelect")!;
const styleSelect = document.querySelector<HTMLSelectElement>("#styleSelect")!;
const rateButtons = document.querySelector<HTMLDivElement>("#rateButtons")!;

document.querySelector("#readFull")?.addEventListener("click", () => sendCommand({ type: "READ_FULL" }));
document.querySelector("#readSelection")?.addEventListener("click", () => sendCommand({ type: "READ_SELECTION" }));
document.querySelector("#readFromSelection")?.addEventListener("click", () => sendCommand({ type: "READ_FROM_SELECTION" }));
document.querySelector("#readNextSegment")?.addEventListener("click", () => sendCommand({ type: "READ_NEXT_SEGMENT" }));
document.querySelector("#stopReading")?.addEventListener("click", () => sendCommand({ type: "STOP_READING" }));
document.querySelector("#resumeReading")?.addEventListener("click", () => sendCommand({ type: "RESUME_READING" }));
document.querySelector("#openOptions")?.addEventListener("click", () => chrome.runtime.openOptionsPage());

voiceSelect.addEventListener("change", () => {
  void saveSettings({ voice: voiceSelect.value }).then(() => sendCommand({ type: "SAVE_READER_SETTINGS", settings: { voice: voiceSelect.value } }));
});

styleSelect.addEventListener("change", () => {
  void saveSettings({ style: styleSelect.value }).then(() => sendCommand({ type: "SAVE_READER_SETTINGS", settings: { style: styleSelect.value } }));
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "STATE_CHANGED") {
    renderState(message.state);
  }
});

void initialize();

async function initialize() {
  for (const voice of VOICES) {
    voiceSelect.append(new Option(voice.label, voice.value));
  }

  for (const style of STYLES) {
    styleSelect.append(new Option(style.label, style.value));
  }

  const settings = await getSettings();
  voiceSelect.value = settings.voice;
  styleSelect.value = settings.style;
  renderRateButtons(settings.rate);

  const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  if (response?.state) {
    renderState(response.state);
    renderRateButtons(response.state.rate);
  }
}

function renderRateButtons(currentRate: number) {
  rateButtons.replaceChildren();

  for (const rate of RATES) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${rate}x`;
    button.className = rate === currentRate ? "active" : "";
    button.addEventListener("click", () => {
      renderRateButtons(rate);
      void sendCommand({ type: "SET_RATE", rate });
    });
    rateButtons.append(button);
  }
}

async function sendCommand(message: RuntimeMessage) {
  statusText.textContent = "处理中...";
  logoMark.classList.add("is-loading");
  const response = await chrome.runtime.sendMessage(message);

  if (!response?.ok) {
    statusText.textContent = response?.error ?? "操作失败";
    logoMark.classList.remove("is-loading");
    return;
  }

  if (response.state) {
    renderState(response.state);
  }
}

function renderState(state: ReaderState) {
  statusText.textContent = state.message;
  logoMark.classList.toggle("is-loading", state.status === "loading");
  renderRateButtons(state.rate);
}
