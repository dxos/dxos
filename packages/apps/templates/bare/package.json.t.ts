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
  "license": "MIT",
  "author": "DXOS.org",
  "repository": "github:dxos/dxos",
  "scripts": {
    "build": "tsc",
    "bundle": "vite build",
    "preview": "vite preview",
    "serve": "vite"
  },
  "dependencies": {
    "@dxos/client": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/config": "${input.monorepo ? 'workspace:*' : packageJson.version}"
  },
  "devDependencies": {
    "@dxos/vite-plugin": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "typescript": "^4.7.2",
    "vite": "^3.2.0-beta.0"
  }${input.monorepo ? '' : `,
  "pnpm": {
    "patchedDependencies": {
      "vite@3.0.9": "patches/vite@3.0.9.patch"
    }
  }`}
}`;

export default template;
