export function messageFromTranscription(text: string) {
  const normalized = text.trim();
  return normalized ? { content: normalized } : null;
}
