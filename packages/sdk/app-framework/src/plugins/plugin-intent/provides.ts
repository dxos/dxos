//
// Copyright 2023 DXOS.org
//

import { type IntentContext, type AnyIntentResolver, type IntentDispatcher } from './intent-dispatcher';
import { type HostContext, type Plugin } from '../plugin-host';

type Context = HostContext & { dispatch: IntentDispatcher };

export type ResolverDefinitions = AnyIntentResolver | AnyIntentResolver[] | ResolverDefinitions[];

export type IntentResolverProvides = {
  intent: {
    resolvers: (context: Context) => ResolverDefinitions;
  };
};

export type IntentPluginProvides = {
  intent: IntentContext;
};

export const parseIntentPlugin = (plugin: Plugin) =>
  (plugin.provides as any).intent?.dispatch ? (plugin as Plugin<IntentPluginProvides>) : undefined;

export const parseIntentResolverPlugin = (plugin: Plugin) =>
  (plugin.provides as any).intent?.resolvers ? (plugin as Plugin<IntentResolverProvides>) : undefined;

//
// Intents
//

const INTENT_PLUGIN = 'dxos.org/plugin/intent';

const INTENT_ACTION = `${INTENT_PLUGIN}/action`;

export enum IntentAction {
  /**
   * Fired after an intent is dispatched if the intent is undoable.
   */
  SHOW_UNDO = `${INTENT_ACTION}/show-undo`,
}
