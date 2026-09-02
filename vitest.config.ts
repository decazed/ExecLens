import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@execlens/protocol": fileURLToPath(new URL("./packages/protocol/src/index.ts", import.meta.url)),
      "@execlens/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@execlens/adapter-tsjs": fileURLToPath(new URL("./packages/adapters/language/tsjs/src/index.ts", import.meta.url)),
      "@execlens/adapter-node-runtime": fileURLToPath(
        new URL("./packages/adapters/runtime/node/src/index.ts", import.meta.url)
      ),
      "@execlens/ui": fileURLToPath(new URL("./packages/ui/src/index.ts", import.meta.url)),
      vscode: fileURLToPath(new URL("./test/mocks/vscode.ts", import.meta.url))
    }
  },
  test: {
    environment: "node",
    globals: false,
    testTimeout: 15_000,
    include: ["test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/test/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        statements: 75,
        branches: 60,
        functions: 85,
        lines: 75
      },
      include: ["packages/**/src/**/*.{ts,js}"],
      exclude: [
        "packages/**/dist/**",
        "packages/adapters/ide/vscode/src/extension.ts",
        "packages/ui/src/panel/**/*.js"
      ]
    }
  }
});
