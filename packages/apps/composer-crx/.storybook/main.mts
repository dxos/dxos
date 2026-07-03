//
// Copyright 2025 DXOS.org
//

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../../tools/storybook-react/.storybook/main';

const here = dirname(fileURLToPath(import.meta.url));
const mock = (file: string) => resolve(here, 'mocks', file);

export const stories = ['../src/**/*.stories.tsx'];

const base = createConfig({ stories });

// Alias extension-only modules to in-memory stubs so components that touch the WebExtension /
// agents APIs can mount in Storybook. These aliases apply to Storybook only (the extension build
// uses vite.config.ts), so the real modules are unaffected.
export default {
  ...base,
  viteFinal: async (config: any, options: any) => {
    const merged = (await base.viteFinal?.(config, options)) ?? config;
    // Assign directly rather than `mergeConfig` — a second merge concatenates the base's
    // `oxc.target` array with itself ("'chrome108' is already specified").
    const aliases: Record<string, string> = {
      'webextension-polyfill': mock('webextension-polyfill.ts'),
      'webext-bridge/popup': mock('webext-bridge-popup.ts'),
      'agents/react': mock('agents-react.ts'),
      'agents/ai-react': mock('agents-ai-react.ts'),
    };
    merged.resolve ??= {};
    const existing = merged.resolve.alias;
    merged.resolve.alias = Array.isArray(existing)
      ? [...existing, ...Object.entries(aliases).map(([find, replacement]) => ({ find, replacement }))]
      : { ...(existing ?? {}), ...aliases };
    return merged;
  },
};
