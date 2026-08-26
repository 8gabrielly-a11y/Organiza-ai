export function persistRuntimeUserInfo(user: unknown) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("manus-runtime-user-info", JSON.stringify(user));
    }
  } catch {
    // Storage can be unavailable in private browsing, embedded previews, or blocked contexts.
  }
}
