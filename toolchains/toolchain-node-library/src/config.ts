//
// Copyright 2022 DXOS.org
//

/**
 * Additional config in esbuild-server.config.js
 */
export interface Config {
  esbuild: {
    config: string,
    outdir: string,
    book: {
      outdir: string
    }
  },
  protobuf: {
    src: string
    output: string
    substitutions: string
  },
  tsc: {
    output: string
  },
  tests: {
    src: string
    spec: string
  }
}

export const defaults: Config = {
  esbuild: {
    config: './esbuild-server.config.js',
    outdir: 'out',
    book: {
      outdir: 'out/book'
    }
  },
  protobuf: {
    src: './src/proto/**/*.proto',
    output: './src/proto/gen',
    substitutions: './src/proto/substitutions.ts'
  },
  tsc: {
    output: './dist'
  },
  tests: {
    src: './src/**/*',
    spec: './src/**/*.test.*'
  }
};
