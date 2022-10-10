//
// Copyright 2022 DXOS.org
//

/**
 * Additional config in esbuild-server.config.js
 */
export interface Config {
  esbuild: {
    config: string
    outdir: string
    book: {
      outdir: string
    }
  }
  protobuf: {
    base: string
    src: string
    output: string
    substitutions: string
  }
  tsc: {
    output: string
  }
  tests: {
    src: string
    spec: string
  }
}

export const defaults: Config = {
  esbuild: {
    config: './esbuild-server.config.cjs',
    outdir: 'out',
    book: {
      outdir: 'out/book'
    }
  },
protobuf: {
    base: './src/proto/',
    src: '**/*.proto',
    output: 'gen',
    substitutions: 'substitutions.ts'
  },
  tsc: {
    output: './dist'
  },
  tests: {
    src: './src/**/*',
    spec: './src/**/*.test.*'
  }
};
