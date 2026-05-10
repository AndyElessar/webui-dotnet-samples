import { defineConfig } from 'rolldown'

export default defineConfig({
  input: './src/index.ts',
  platform: 'browser',
  tsconfig: './tsconfig.client.json',
  output: {
    format: 'esm',
  },
})
