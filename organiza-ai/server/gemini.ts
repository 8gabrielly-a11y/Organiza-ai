type GeminiMessage = { role: "user" | "model"; text: string };

export async function invokeGeminiJson(apiKey: string, systemInstruction: string, message: string, history: GeminiMessage[] = []) {
  const model = "gemini-2.0-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [...history.map(item => ({ role: item.role, parts: [{ text: item.text }] })), { role: "user", parts: [{ text: message }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
  const body = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = body.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("") ?? "{}";
  return { choices: [{ message: { content: text } }] };
}
