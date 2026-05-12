import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
  },
  platform: 'browser',
  tsconfig: './tsconfig.client.json',
  format: 'esm',
  deps: {
    alwaysBundle: ['@microsoft/webui-framework'],
    onlyBundle: false,
  },
})