import { describe, expect, it } from "vitest";
import {
  isVideoFile,
  isWavFile,
  validateUpload,
  type UploadFormValues,
} from "./uploadValidation";

function fileLike(name: string, type = ""): File {
  return { name, type } as File;
}

const base: UploadFormValues = {
  kind: "song",
  artist: "The Believers",
  title: "Sunday Groove",
  audioFile: fileLike("sunday.wav", "audio/wav"),
  videoFile: null,
};

// @kliv-spec-derived — from user intent: "a form like artist name, must be a wav file,
// and they can upload even music videos"
describe("validateUpload", () => {
  it("requires the artist name", () => {
    expect(validateUpload({ ...base, artist: "   " })).toBe("Artist name is required");
  });

  it("requires a song title", () => {
    expect(validateUpload({ ...base, title: "" })).toBe("Song title is required");
  });

  it("accepts a WAV song with artist and title filled in", () => {
    expect(validateUpload(base)).toBeNull();
  });

  it("rejects an mp3 song because songs must be WAV", () => {
    expect(validateUpload({ ...base, audioFile: fileLike("track.mp3", "audio/mpeg") })).toMatch(/WAV/);
  });

  it("rejects a missing song file", () => {
    expect(validateUpload({ ...base, audioFile: null })).toMatch(/WAV/);
  });

  it("accepts an uppercase .WAV extension", () => {
    expect(validateUpload({ ...base, audioFile: fileLike("Track.WAV", "") })).toBeNull();
  });

  it("requires a video file when sharing a music video", () => {
    expect(validateUpload({ ...base, kind: "video", audioFile: null, videoFile: null })).toMatch(
      /Choose a music video/,
    );
  });

  it("accepts an mp4 music video", () => {
    expect(
      validateUpload({ ...base, kind: "video", videoFile: fileLike("live.mp4", "video/mp4") }),
    ).toBeNull();
  });

  it("rejects an avi music video", () => {
    expect(
      validateUpload({ ...base, kind: "video", videoFile: fileLike("live.avi", "video/x-msvideo") }),
    ).toMatch(/MP4, WebM or MOV/);
  });

  it("still enforces WAV for the song attached to a music video", () => {
    expect(
      validateUpload({
        ...base,
        kind: "video",
        videoFile: fileLike("live.mp4", "video/mp4"),
        audioFile: fileLike("backing.aiff", "audio/aiff"),
      }),
    ).toMatch(/must be WAV/);
  });
});

// code-consistent — file-type sniffing details
describe("isWavFile / isVideoFile", () => {
  it("detects wav by extension or mime type", () => {
    expect(isWavFile(fileLike("a.wav"))).toBe(true);
    expect(isWavFile(fileLike("a.WAVE"))).toBe(true);
    expect(isWavFile(fileLike("noext", "audio/x-wav"))).toBe(true);
    expect(isWavFile(fileLike("a.flac", "audio/flac"))).toBe(false);
    expect(isWavFile(fileLike("a.mp3", "audio/mpeg"))).toBe(false);
  });

  it("detects playable video formats only", () => {
    expect(isVideoFile(fileLike("a.mp4"))).toBe(true);
    expect(isVideoFile(fileLike("a.webm"))).toBe(true);
    expect(isVideoFile(fileLike("a.mov"))).toBe(true);
    expect(isVideoFile(fileLike("noext", "video/webm"))).toBe(true);
    expect(isVideoFile(fileLike("a.avi", "video/x-msvideo"))).toBe(false);
    expect(isVideoFile(fileLike("a.wav", "audio/wav"))).toBe(false);
  });
});
