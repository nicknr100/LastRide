import { describe, expect, it } from "vitest";
import { kanaToRomaji } from "../src/lib/romaji";

/**
 * NAVITIME and Ekispert return Japanese names with a kana reading; English mode
 * shows these romanized. The target is what station signs print, not strict
 * Hepburn: long vowels are dropped rather than marked.
 */
describe("kanaToRomaji", () => {
  it.each([
    ["しぶや", "Shibuya"],
    ["しんじゅく", "Shinjuku"],
    ["きちじょうじ", "Kichijoji"],
    ["おちゃのみず", "Ochanomizu"],
  ])("reads %s as %s", (kana, expected) => {
    expect(kanaToRomaji(kana)).toBe(expected);
  });

  it("writes n as m before b, m and p, as station signs do", () => {
    expect(kanaToRomaji("しんばし")).toBe("Shimbashi");
  });

  it("doubles the consonant after a small tsu", () => {
    expect(kanaToRomaji("ろっぽんぎ")).toBe("Roppongi");
    expect(kanaToRomaji("はっちょうぼり")).toBe("Hatchobori");
  });

  it("drops long vowels instead of marking them", () => {
    expect(kanaToRomaji("とうきょう")).toBe("Tokyo");
    expect(kanaToRomaji("おおさか")).toBe("Osaka");
  });

  it("accepts katakana too", () => {
    expect(kanaToRomaji("シブヤ")).toBe("Shibuya");
  });
});
