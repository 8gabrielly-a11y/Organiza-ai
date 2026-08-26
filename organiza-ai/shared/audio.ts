export function normalizeAudioMimeType(mimeType: string) {
  if (mimeType.includes("mp4")) return "audio/mp4" as const;
  if (mimeType.includes("mpeg")) return "audio/mpeg" as const;
  if (mimeType.includes("wav")) return "audio/wav" as const;
  if (mimeType.includes("ogg")) return "audio/ogg" as const;
  return "audio/webm" as const;
}
