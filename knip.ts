import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/index.ts'],
  project: ['src/**/*.ts'],
  ignoreDependencies: [
    //
    '@dxos/node-std',
    '@bufbuild/buf',
    '@bufbuild/protoc-gen-es',
  ],
  storybook: false,
};

export default config;
