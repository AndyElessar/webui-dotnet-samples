import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
  },
  platform: 'browser',
  tsconfig: './tsconfig.client.json',
  format: 'esm',
  deps: {
    // Match the package root and its subpath exports (e.g. `/runtime.js`).
    alwaysBundle: [/^@microsoft\/webui-framework(\/.*)?$/],
    onlyBundle: false,
  },
})