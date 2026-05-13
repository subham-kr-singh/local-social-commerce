import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    pool: "forks",
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
