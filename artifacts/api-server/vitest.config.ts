import { defineConfig } from "vitest/config";

/**
 * Unit tests for the server's pure logic: the kana→romaji reading used for
 * English station names, and the Japanese→English line-name translation. Both
 * stand in for provider data we cannot get in English, so they are worth
 * pinning down. Nothing here makes a network request.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
