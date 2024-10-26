//
// Copyright 2023 DXOS.org
//

import { type IntentContext } from './IntentContext';
import { type IntentResolver } from './intent';
import { type Plugin } from '../plugin-host';

export type IntentResolverProvides = {
  intent: {
    resolver: IntentResolver;
  };
};

export type IntentPluginProvides = {
  intent: IntentContext;
};

export const parseIntentPlugin = (plugin: Plugin) =>
  (plugin.provides as any).intent?.dispatch ? (plugin as Plugin<IntentPluginProvides>) : undefined;

export const parseIntentResolverPlugin = (plugin: Plugin) =>
  (plugin.provides as any).intent?.resolver ? (plugin as Plugin<IntentResolverProvides>) : undefined;

//
// Intents
//

const INTENT_ACTION = 'dxos.org/plugin/intent';

export enum IntentAction {
  /**
   * Fired after an intent is dispatched if the intent is undoable.
   */
  SHOW_UNDO = `${INTENT_ACTION}/show-undo`,
}
