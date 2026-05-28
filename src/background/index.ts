import { RATES, type ReaderSettings } from "../shared/config";
import type { ExtractMode, ExtractResult, OffscreenMessage, ReaderState, RuntimeMessage } from "../shared/messages";
import { getSettings, saveSettings } from "../shared/storage";
import type { TextSegment } from "../shared/text";
import { synthesizeSpeech } from "../shared/tts";

const MENU = {
  readFull: "readmi-read-full",
  stop: "readmi-stop",
  resume: "readmi-resume",
  next: "readmi-next",
  readSelection: "readmi-read-selection",
  fromSelection: "readmi-from-selection"
} as const;

const PREFETCH_AHEAD = 1;

interface AudioCacheEntry {
  taskId: number;
  controller: AbortController;
  promise: Promise<string>;
}

let settings: ReaderSettings;
let queue: TextSegment[] = [];
let currentIndex = -1;
let activeTabId: number | undefined;
let currentJobId = 0;
let currentTaskId = 0;
let hasCurrentAudio = false;
let pausedDuringLoading = false;
let audioCache = new Map<number, AudioCacheEntry>();
let state: ReaderState = {
  status: "idle",
  message: "准备朗读",
  rate: 1,
  canResume: false
};

void initialize();

async function initialize() {
  settings = await getSettings();
  state.rate = settings.rate;
  await createMenus();
}

chrome.runtime.onInstalled.addListener(() => {
  void createMenus();
});

chrome.runtime.onStartup.addListener(() => {
  void createMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) {
    return;
  }

  if (info.menuItemId === MENU.readFull) {
    void startReading(tab.id, "full");
  } else if (info.menuItemId === MENU.readSelection) {
    void startReading(tab.id, "selection");
  } else if (info.menuItemId === MENU.fromSelection) {
    void startReading(tab.id, "from-selection");
  } else if (info.menuItemId === MENU.stop) {
    void stopReading();
  } else if (info.menuItemId === MENU.resume) {
    void resumeReading();
  } else if (info.menuItemId === MENU.next) {
    void readNextSegment();
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  void handleMessage(message, sender.tab?.id).then(sendResponse);
  return true;
});

async function handleMessage(message: RuntimeMessage, senderTabId?: number) {
  try {
    if (message.type === "GET_STATE") {
      return { ok: true, state };
    }

    if (message.type === "READ_FULL") {
      await startReading(await getActiveTabId(senderTabId), "full");
    } else if (message.type === "READ_SELECTION") {
      await startReading(await getActiveTabId(senderTabId), "selection");
    } else if (message.type === "READ_FROM_SELECTION") {
      await startReading(await getActiveTabId(senderTabId), "from-selection");
    } else if (message.type === "READ_NEXT_SEGMENT") {
      await readNextSegment();
    } else if (message.type === "STOP_READING") {
      await stopReading();
    } else if (message.type === "RESUME_READING") {
      await resumeReading();
    } else if (message.type === "SET_RATE") {
      await setRate(message.rate);
    } else if (message.type === "SAVE_READER_SETTINGS") {
      settings = await saveSettings(message.settings);
      state.rate = settings.rate;
      resetAudioRequests();
      await sendOffscreen({ type: "SET_AUDIO_RATE", rate: settings.rate });
    } else if (message.type === "OFFSCREEN_ENDED") {
      if (message.jobId === currentJobId) {
        hasCurrentAudio = false;
        await playNext();
      }
    } else if (message.type === "OFFSCREEN_ERROR") {
      if (message.jobId === currentJobId) {
        setState("error", message.message);
      }
    }

    return { ok: true, state };
  } catch (error) {
    if (isAbortError(error)) {
      return { ok: true, state };
    }

    const messageText = error instanceof Error ? error.message : "操作失败";
    setState("error", messageText);
    return { ok: false, error: messageText, state };
  }
}

async function startReading(tabId: number, mode: ExtractMode) {
  settings = await getSettings();
  state.rate = settings.rate;

  if (!settings.apiKey) {
    await chrome.runtime.openOptionsPage().catch(() => undefined);
    throw new Error("请先去设置页填写 API Key");
  }

  await stopCurrentTask();
  currentTaskId += 1;
  activeTabId = tabId;
  setState("loading", "正在提取网页内容");

  const result = await sendToContent<ExtractResult>(tabId, { type: "EXTRACT_TEXT", mode });
  queue = result.segments;
  currentIndex = -1;

  if (queue.length === 0) {
    throw new Error("没有找到可朗读的文本");
  }

  warmAudioCache(0);
  await playNext();
}

async function playNext() {
  if (!activeTabId) {
    setState("idle", "准备朗读");
    return;
  }

  currentIndex += 1;
  await playCurrentSegment();
}

async function playCurrentSegment() {
  if (!activeTabId) {
    setState("idle", "准备朗读");
    return;
  }

  const segment = queue[currentIndex];
  const taskId = currentTaskId;

  if (!segment) {
    await sendToContent(activeTabId, { type: "CLEAR_HIGHLIGHT" });
    setState("idle", "朗读完成", { canResume: false, currentText: undefined });
    return;
  }

  currentJobId += 1;
  const jobId = currentJobId;
  hasCurrentAudio = false;
  pausedDuringLoading = false;
  setState("loading", "正在生成语音", {
    currentText: segment.text,
    canResume: false
  });
  await sendToContent(activeTabId, { type: "HIGHLIGHT_SEGMENT", segmentId: segment.id });
  warmAudioCache(currentIndex);

  const dataUrl = await getAudioForIndex(currentIndex, taskId);
  if (jobId !== currentJobId || taskId !== currentTaskId) {
    return;
  }

  await ensureOffscreen();
  await sendOffscreen({
    type: "PLAY_AUDIO",
    jobId,
    dataUrl,
    rate: settings.rate
  });
  hasCurrentAudio = true;
  setState("playing", "正在朗读", {
    currentText: segment.text,
    canResume: false
  });
  warmAudioCache(currentIndex + 1);
}

async function stopReading() {
  if (state.status !== "playing" && state.status !== "loading") {
    setState(state.status, state.message || "没有正在朗读的内容");
    return;
  }

  await resetAudioPipeline();
  setState("paused", "已停止，可继续朗读", { canResume: currentIndex >= 0 && currentIndex < queue.length });
}

async function resumeReading() {
  if (state.status !== "paused") {
    throw new Error("没有可继续的朗读内容");
  }

  await playCurrentSegment();
}

async function readNextSegment() {
  if (!activeTabId || queue.length === 0) {
    throw new Error("没有可朗读的下一段");
  }

  await resetAudioPipeline();
  currentIndex += 1;
  await playCurrentSegment();
}

async function stopCurrentTask() {
  await resetAudioPipeline();
  if (activeTabId) {
    await sendToContent(activeTabId, { type: "CLEAR_HIGHLIGHT" }).catch(() => undefined);
  }
  queue = [];
  currentIndex = -1;
  activeTabId = undefined;
}

async function setRate(rate: number) {
  if (!RATES.includes(rate as (typeof RATES)[number])) {
    throw new Error("不支持的倍速");
  }

  settings = await saveSettings({ rate });
  state.rate = rate;
  await sendOffscreen({ type: "SET_AUDIO_RATE", rate }, false);
  setState(state.status, state.message, { rate });
}

function warmAudioCache(startIndex: number) {
  const taskId = currentTaskId;
  const endIndex = Math.min(queue.length - 1, startIndex + PREFETCH_AHEAD);

  for (let index = startIndex; index <= endIndex; index += 1) {
    startAudioRequest(index, taskId);
  }
}

function startAudioRequest(index: number, taskId: number) {
  if (audioCache.has(index)) {
    return;
  }

  const segment = queue[index];
  if (!segment) {
    return;
  }

  const settingsSnapshot = { ...settings };
  const controller = new AbortController();
  const promise = synthesizeSpeech(segment.text, settingsSnapshot, controller.signal);
  promise.catch(() => undefined);
  audioCache.set(index, { taskId, controller, promise });
}

async function getAudioForIndex(index: number, taskId: number): Promise<string> {
  startAudioRequest(index, taskId);
  const entry = audioCache.get(index);

  if (!entry || entry.taskId !== taskId) {
    throw new Error("朗读任务已更新");
  }

  return entry.promise;
}

async function resetAudioPipeline() {
  currentJobId += 1;
  currentTaskId += 1;
  hasCurrentAudio = false;
  pausedDuringLoading = false;
  resetAudioRequests();
  await sendOffscreen({ type: "STOP_AUDIO" }, false);
}

function resetAudioRequests() {
  for (const entry of audioCache.values()) {
    entry.controller.abort();
  }
  audioCache.clear();
}

async function createMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU.readFull,
    title: "朗读全文",
    contexts: ["page", "frame", "editable", "selection"]
  });
  chrome.contextMenus.create({
    id: MENU.stop,
    title: "停止朗读",
    contexts: ["page", "frame", "editable", "selection"]
  });
  chrome.contextMenus.create({
    id: MENU.resume,
    title: "继续朗读",
    contexts: ["page", "frame", "editable", "selection"]
  });
  chrome.contextMenus.create({
    id: MENU.next,
    title: "朗读下一段",
    contexts: ["page", "frame", "editable", "selection"]
  });
  chrome.contextMenus.create({
    id: MENU.readSelection,
    title: "朗读选中",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: MENU.fromSelection,
    title: "从选中位置开始",
    contexts: ["selection"]
  });
}

async function getActiveTabId(fallback?: number): Promise<number> {
  if (fallback) {
    return fallback;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error("没有找到当前标签页");
  }
  return tab.id;
}

async function sendToContent<T>(tabId: number, message: Parameters<typeof chrome.tabs.sendMessage>[1]): Promise<T> {
  return chrome.tabs.sendMessage(tabId, message) as Promise<T>;
}

async function ensureOffscreen() {
  const hasDocument = await chrome.offscreen.hasDocument();
  if (hasDocument) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
    justification: "播放由 MiMo TTS 生成的网页朗读音频"
  });
}

async function sendOffscreen(message: OffscreenMessage, createIfMissing = true) {
  if (createIfMissing) {
    await ensureOffscreen();
  } else if (!(await chrome.offscreen.hasDocument())) {
    return;
  }

  await chrome.runtime.sendMessage(message);
}

function setState(status: ReaderState["status"], message: string, patch: Partial<ReaderState> = {}) {
  state = {
    ...state,
    ...patch,
    status,
    message
  };
  void chrome.runtime.sendMessage({ type: "STATE_CHANGED", state }).catch(() => undefined);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
