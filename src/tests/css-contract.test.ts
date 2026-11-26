import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

describe("index.css responsive contract", () => {
  it("does not force a fixed minimum width on tables", () => {
    expect(css).not.toContain("min-width: 42rem");
  });

  it("uses dynamic viewport units for full-height layouts", () => {
    expect(css).toContain("100dvh");
  });

  it("respects the user's reduced-motion preference", () => {
    expect(css).toContain("prefers-reduced-motion");
  });

  it("respects the user's high-contrast preference", () => {
    expect(css).toContain("prefers-contrast");
  });

  it("does not remove the focus outline on the global form controls", () => {
    expect(css).not.toMatch(
      /button,\s*a,\s*input,\s*select,\s*textarea\s*\{[^}]*outline:\s*none/,
    );
  });

  it("sources the sidebar width from the shared token", () => {
    expect(css).toMatch(/\.sidebar\s*\{[^}]*width:\s*var\(--sidebar-width\)/);
  });

  it("keeps result metadata and task status badges visible when stacked", () => {
    expect(css).not.toMatch(/\.results-meta span\s*\{[^}]*display:\s*none/);
    expect(css).not.toMatch(/\.task-row\s*>\s*\.status-badge\s*\{[^}]*display:\s*none/);
  });
});
