import { describe, expect, it } from "vitest";
import { lineNameEn } from "../src/lib/lineNames";

/**
 * Ekispert only returns Japanese line names, so these are translated here.
 * An unrecognised line must stay Japanese rather than become a half-translated
 * mix, which is the property most worth protecting.
 */
describe("lineNameEn", () => {
  it("translates a line with its operator and service type", () => {
    expect(lineNameEn("ＪＲ中央線快速・高尾行")).toBe("JR Chuo Line Rapid");
    expect(lineNameEn("京王井の頭線急行・吉祥寺行")).toBe("Keio Inokashira Line Express");
    expect(lineNameEn("東急田園都市線急行・中央林間行")).toBe("Tokyu Den-en-toshi Line Express");
  });

  it("puts loop directions in brackets", () => {
    expect(lineNameEn("ＪＲ山手線外回り・新宿・池袋方面")).toBe("JR Yamanote Line (outer loop)");
    expect(lineNameEn("ＪＲ大阪環状線内回り")).toBe("JR Osaka Loop Line (inner loop)");
  });

  it("handles operators that are the line, and ones that need no suffix", () => {
    expect(lineNameEn("京王線特急・京王八王子行")).toBe("Keio Line Limited Express");
    expect(lineNameEn("ゆりかもめ・豊洲行")).toBe("Yurikamome");
  });

  it("romanizes shinkansen train names", () => {
    expect(lineNameEn("ＪＲ新幹線のぞみ")).toBe("Shinkansen Nozomi");
  });

  it("leaves an unknown line in Japanese", () => {
    expect(lineNameEn("どこか鉄道謎線")).toBe("どこか鉄道謎線");
  });
});
