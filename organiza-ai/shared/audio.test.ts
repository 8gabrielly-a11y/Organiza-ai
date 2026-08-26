import { describe, expect, it } from "vitest";
import { normalizeAudioMimeType } from "./audio";
import { messageFromTranscription } from "./chatFlow";

describe("audio mime normalization", () => {
  it("normalizes browser recorder formats accepted by transcription", () => {
    expect(normalizeAudioMimeType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeAudioMimeType("audio/mp4")).toBe("audio/mp4");
    expect(normalizeAudioMimeType("audio/mpeg")).toBe("audio/mpeg");
    expect(normalizeAudioMimeType("audio/wav")).toBe("audio/wav");
    expect(normalizeAudioMimeType("audio/ogg")).toBe("audio/ogg");
  });
});

describe("transcription chat reinjection", () => {
  it("returns a chat message for non-empty transcription and ignores blank text", () => {
    expect(messageFromTranscription("  lembrar da reunião  ")).toEqual({ content: "lembrar da reunião" });
    expect(messageFromTranscription("   ")).toBeNull();
  });
});
