import { describe, it, expect } from "vitest";
import { parseFixSummary } from "./autofix-panel.component";

/**
 * The agent's closing summary is free text that only usually follows the
 * ROOT CAUSE / FIX / TEST / CONFIDENCE shape the runner asks for. The panel
 * must split the labelled parts, keep multi-line parts whole, render inline
 * code, and still show something when the shape is missing.
 */
describe("parseFixSummary", () => {
  it("splits labelled parts, keeping multi-line text and dropping confidence", () => {
    const parts = parseFixSummary(
      "Done.\nROOT CAUSE: `COUPONS[code]` is case sensitive\nso lowercase codes fail.\nFIX: upper-case the code\nTEST: added a test\nCONFIDENCE: high",
    );
    expect(parts.map((p) => p.text)).toEqual([
      "`COUPONS[code]` is case sensitive\nso lowercase codes fail.",
      "upper-case the code",
      "added a test",
    ]);
    expect(parts[0].segments).toEqual([
      { code: true, text: "COUPONS[code]" },
      { code: false, text: " is case sensitive\nso lowercase codes fail." },
    ]);
  });

  it("falls back to the whole text when the shape is missing", () => {
    const parts = parseFixSummary("I could not find the file.");
    expect(parts).toHaveLength(1);
    expect(parts[0].text).toBe("I could not find the file.");
  });
});
