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
  "description": "DXOS 'hello world' application template.",
  ${input.monorepo ? `
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": "github:dxos/dxos",
  "license": "MIT",
  "author": "DXOS.org",
  ` : ''}"scripts": {
    "build": "tsc",
    "bundle": "vite build",
    "deploy": "dx app publish",
    "preview": "vite preview",
    "serve": "vite",
    "storybook": "start-storybook -p 9009 --no-open"
  },
  "dependencies": {
    "@dxos/client": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/config": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/react-appkit": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/react-client": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/react-composer": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/text-model": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/react-ui": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/react-uikit": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/util": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "classnames": "^2.3.2",
    "phosphor-react": "^1.4.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.3.0",
    "url-join": "^5.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.18.13",
    "@dxos/cli": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/vite-plugin": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@storybook/addon-actions": "^6.5.10",
    "@storybook/addon-essentials": "^6.5.10",
    "@storybook/addon-interactions": "^6.5.10",
    "@storybook/addon-links": "^6.5.10",
    "@storybook/builder-vite": "^0.2.2",
    "@storybook/mdx2-csf": "^0.0.3",
    "@storybook/react": "^6.5.10",
    "@storybook/testing-library": "^0.0.13",
    "@types/react": "^18.0.21",
    "@types/react-dom": "^18.0.6",
    "@vitejs/plugin-react": "^2.0.1",
    "require-from-string": "^2.0.2",
    "storybook-dark-mode": "^1.1.2",
    "typescript": "^4.8.4",
    "vite": "3.0.9",
    "vite-plugin-pwa": "^0.12.4",
    "webpack": "^5.74.0",
    "workbox-window": "^6.5.4"
  }${input.monorepo ? '' : `,
  "pnpm": {
    "patchedDependencies": {
      "vite@3.0.9": "patches/vite@3.0.9.patch"
    }
  }`}
}`;

export default template;
