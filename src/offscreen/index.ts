import type { OffscreenMessage } from "../shared/messages";

let audio: HTMLAudioElement | null = null;
let currentJobId = 0;
let lastDataUrl = "";
let lastTime = 0;
let lastRate = 1;

chrome.runtime.onMessage.addListener((message: OffscreenMessage) => {
  if (message.type === "PLAY_AUDIO") {
    playAudio(message.jobId, message.dataUrl, message.rate);
  } else if (message.type === "PAUSE_AUDIO") {
    pauseAudio();
  } else if (message.type === "RESUME_AUDIO") {
    resumeAudio();
  } else if (message.type === "STOP_AUDIO") {
    stopAudio();
  } else if (message.type === "SET_AUDIO_RATE") {
    lastRate = message.rate;
    if (audio) {
      audio.playbackRate = message.rate;
    }
  }
});

function playAudio(jobId: number, dataUrl: string, rate: number) {
  stopAudio();

  currentJobId = jobId;
  lastDataUrl = dataUrl;
  lastTime = 0;
  lastRate = rate;
  audio = new Audio(dataUrl);
  audio.playbackRate = rate;
  audio.addEventListener("timeupdate", () => {
    lastTime = audio?.currentTime ?? lastTime;
  });
  audio.addEventListener("ended", () => {
    void chrome.runtime.sendMessage({ type: "OFFSCREEN_ENDED", jobId });
  });
  audio.addEventListener("error", () => {
    void chrome.runtime.sendMessage({
      type: "OFFSCREEN_ERROR",
      jobId,
      message: "音频播放失败"
    });
  });

  void audio.play().catch((error) => {
    void chrome.runtime.sendMessage({
      type: "OFFSCREEN_ERROR",
      jobId,
      message: error instanceof Error ? error.message : "音频播放失败"
    });
  });
}

function pauseAudio() {
  if (!audio) {
    return;
  }

  lastTime = audio.currentTime;
  audio.pause();
}

function resumeAudio() {
  if (!audio && lastDataUrl) {
    audio = new Audio(lastDataUrl);
    audio.currentTime = lastTime;
    audio.playbackRate = lastRate;
    audio.addEventListener("ended", () => {
      void chrome.runtime.sendMessage({ type: "OFFSCREEN_ENDED", jobId: currentJobId });
    });
  }

  if (!audio) {
    return;
  }

  audio.currentTime = lastTime;
  audio.playbackRate = lastRate;
  void audio.play();
}

function stopAudio() {
  if (!audio) {
    return;
  }

  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  audio = null;
}
