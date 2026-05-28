import type { ReaderSettings } from "./config";
import type { TextSegment } from "./text";

export type ExtractMode = "full" | "selection" | "from-selection";
export type ReaderStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface ReaderState {
  status: ReaderStatus;
  message: string;
  rate: number;
  currentText?: string;
  canResume: boolean;
}

export type RuntimeMessage =
  | { type: "READ_FULL" }
  | { type: "READ_SELECTION" }
  | { type: "READ_FROM_SELECTION" }
  | { type: "READ_NEXT_SEGMENT" }
  | { type: "STOP_READING" }
  | { type: "RESUME_READING" }
  | { type: "SET_RATE"; rate: number }
  | { type: "SAVE_READER_SETTINGS"; settings: Partial<ReaderSettings> }
  | { type: "GET_STATE" }
  | { type: "OFFSCREEN_ENDED"; jobId: number }
  | { type: "OFFSCREEN_ERROR"; jobId: number; message: string };

export type ContentMessage =
  | { type: "EXTRACT_TEXT"; mode: ExtractMode }
  | { type: "HIGHLIGHT_SEGMENT"; segmentId: string }
  | { type: "CLEAR_HIGHLIGHT" };

export type OffscreenMessage =
  | { type: "PLAY_AUDIO"; jobId: number; dataUrl: string; rate: number }
  | { type: "PAUSE_AUDIO" }
  | { type: "RESUME_AUDIO" }
  | { type: "STOP_AUDIO" }
  | { type: "SET_AUDIO_RATE"; rate: number };

export interface ExtractResult {
  segments: TextSegment[];
}
