import { describe, expect, it } from "vitest";
import { decryptUserSecret, encryptUserSecret, publicProfile } from "./profile";

describe("profile contracts", () => {
  it("sanitizes Gemini secrets while retaining the has-key indicator", () => {
    const safe = publicProfile({ userId: 7, preferredName: "Bia", communicationTone: "balanced", geminiKeyEncrypted: "encrypted-secret" });
    expect(safe).toMatchObject({ userId: 7, preferredName: "Bia", communicationTone: "balanced", hasGeminiKey: true });
    expect(safe?.geminiKeyEncrypted).toBeUndefined();
    expect(JSON.stringify(safe)).not.toContain("encrypted-secret");
  });

  it("keeps a profile without Gemini configured as optional", () => {
    expect(publicProfile({ userId: 8, geminiKeyEncrypted: null })).toMatchObject({ userId: 8, hasGeminiKey: false });
  });

  it("encrypts and decrypts an individual Gemini key", () => {
    const encrypted = encryptUserSecret("AIza-test-key");
    expect(encrypted).not.toContain("AIza-test-key");
    expect(decryptUserSecret(encrypted)).toBe("AIza-test-key");
  });
});
