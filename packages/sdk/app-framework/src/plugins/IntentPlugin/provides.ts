//
// Copyright 2023 DXOS.org
//

import { type IntentContext } from './IntentContext';
import { type Intent } from './intent';
import { type Plugin } from '../PluginHost';

export type IntentResolverProvides = {
  intent: {
    resolver: (intent: Intent, plugins: Plugin[]) => any;
  };
};

export type IntentPluginProvides = {
  intent: IntentContext;
};

export const parseIntentPlugin = (plugin: Plugin) =>
  (plugin.provides as any).intent?.dispatch ? (plugin as Plugin<IntentPluginProvides>) : undefined;

export const parseIntentResolverPlugin = (plugin: Plugin) =>
  (plugin.provides as any).intent?.resolver ? (plugin as Plugin<IntentResolverProvides>) : undefined;
