import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { persistRuntimeUserInfo } from "./auth";

describe("runtime auth persistence", () => {
  it("does not throw when browser storage is unavailable", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => { throw new Error("storage blocked"); },
    });
    expect(() => persistRuntimeUserInfo({ id: 7 })).not.toThrow();
    vi.unstubAllGlobals();
  });

  it("keeps a visible UI tree renderable when auth persistence fails", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => { throw new Error("storage blocked"); },
    });
    function AuthenticatedShell() {
      persistRuntimeUserInfo({ id: 7 });
      return React.createElement("main", null, "Agenda visível");
    }
    expect(renderToStaticMarkup(React.createElement(AuthenticatedShell))).toContain("Agenda visível");
    vi.unstubAllGlobals();
  });
});
