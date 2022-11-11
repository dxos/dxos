//
// Copyright 2022 DXOS.org
//

import { TemplateFunction } from '@dxos/plate';

import packageJson from './package.json';

export type Input = {
  monorepo?: boolean
  name: string
}

// TODO(wittjosiah): Nx executor to execute in place.
const template: TemplateFunction<Input> = ({ input }) => /* javascript */ `{
  "name": "${input.name}",
  "version": "${packageJson.version}",
  "private": true,
  "description": "Application template with only the essentials.",
  ${input.monorepo ? '' : `
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": "github:dxos/dxos",
  "license": "MIT",
  "author": "DXOS.org",
  `}"scripts": {
    "build": "tsc",
    "bundle": "vite build",
    "deploy": "dx app publish",
    "preview": "vite preview",
    "serve": "vite"
  },
  "dependencies": {
    "@dxos/client": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/config": "${input.monorepo ? 'workspace:*' : packageJson.version}"
  },
  "devDependencies": {
    "@dxos/cli": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/vite-plugin": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "typescript": "^4.8.4",
    "vite": "3.0.9"
  }${input.monorepo ? '' : `,
  "pnpm": {
    "patchedDependencies": {
      "vite@3.0.9": "patches/vite@3.0.9.patch"
    }
  }`}
}`;

export default template;
