import { describe, it, expect } from "vitest";
import {
  convertAbcString,
  countTunes,
  normalizeAbcForAbcjs,
  normalizeHashSharpsToAbcCaret,
} from "./abcPipeline";

const SIMPLE_ABC = `X:1
T:Hello
M:4/4
L:1/4
K:C
CDEF|
`;

describe("normalizeHashSharpsToAbcCaret", () => {
  it("converts F# style to ABC ^F", () => {
    expect(normalizeHashSharpsToAbcCaret("G F# E")).toBe("G ^F E");
    expect(normalizeHashSharpsToAbcCaret("c#4")).toBe("^c4");
  });
  it("converts double sharp ##", () => {
    expect(normalizeHashSharpsToAbcCaret("A##2")).toBe("^^A2");
  });
});

describe("normalizeAbcForAbcjs", () => {
  it("fixes blank line after K: so abcjs emits staff lines", () => {
    const raw = `X:1
T:Star
M:4/4
L:1/4
K:D

D2 A2 |
`;
    const n = normalizeAbcForAbcjs(raw);
    expect(n).not.toMatch(/K:D\n\n/);
    const r = convertAbcString(raw);
    expect(r.success).toBe(true);
    expect(r.musicXml).toContain("score-partwise");
  });
});

describe("convertAbcString", () => {
  it("produces MusicXML for simple scale", () => {
    const r = convertAbcString(SIMPLE_ABC);
    expect(r.success).toBe(true);
    expect(r.musicXml).toBeDefined();
    expect(r.musicXml).toContain("score-partwise");
    expect(r.preview?.title).toBe("Hello");
  });

  it("rejects empty input", () => {
    const r = convertAbcString("   ");
    expect(r.success).toBe(false);
  });
});

describe("countTunes", () => {
  it("counts multiple X: sections", () => {
    const book = `${SIMPLE_ABC}\nX:2\nT:Second\nK:G\ngab|`;
    expect(countTunes(book)).toBeGreaterThanOrEqual(2);
  });
});
