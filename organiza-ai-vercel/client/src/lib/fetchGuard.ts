export async function fetchWithJsonGuard(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await globalThis.fetch(input, init);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (response.status !== 204 && !contentType.includes("application/json")) {
    let detail = "";
    try {
      detail = (await response.clone().text()).replace(/\s+/g, " ").trim().slice(0, 160);
    } catch {
      // Keep the operational error useful even if the body cannot be read.
    }

    const suffix = detail ? ` Detalhe: ${detail}` : "";
    throw new Error(`A API não retornou JSON (HTTP ${response.status}). Verifique o deployment do Vercel.${suffix}`);
  }

  return response;
}
