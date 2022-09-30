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
  "license": "MIT",
  "author": "DXOS.org",
  "repository": "github:dxos/dxos",
  "scripts": {
    "build": "tsc",
    "bundle": "vite build",
    "preview": "vite preview",
    "serve": "vite",
    "storybook": "start-storybook -p 9009 --no-open"
  },
  "dependencies": {
    "@dxos/client": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/config": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/react-client": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/react-components": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/react-toolkit": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@mui/icons-material": "^5.8.0",
    "@mui/material": "^5.8.1",
    "react": "^17.0.2",
    "react-dom": "^17.0.2"
  },
  "devDependencies": {
    "@babel/core": "^7.18.13",
    "@dxos/react-client-testing": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@dxos/vite-plugin": "${input.monorepo ? 'workspace:*' : packageJson.version}",
    "@storybook/addon-actions": "^6.5.10",
    "@storybook/addon-essentials": "^6.5.10",
    "@storybook/addon-interactions": "^6.5.10",
    "@storybook/addon-links": "^6.5.10",
    "@storybook/builder-vite": "^0.2.2",
    "@storybook/mdx2-csf": "^0.0.3",
    "@storybook/react": "^6.5.10",
    "@storybook/testing-library": "^0.0.13",
    "@types/react": "^17.0.24",
    "@types/react-dom": "^17.0.9",
    "@vitejs/plugin-react": "^2.0.1",
    "require-from-string": "^2.0.2",
    "typescript": "^4.7.2",
    "vite": "3.0.9",
    "vite-plugin-pwa": "^0.12.4",
    "webpack": "^5.74.0"
  }${input.monorepo ? '' : `,
  "pnpm": {
    "patchedDependencies": {
      "vite@3.0.9": "patches/vite@3.0.9.patch"
    }
  }`}
}`;

export default template;
