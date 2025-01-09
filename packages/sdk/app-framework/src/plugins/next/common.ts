//
// Copyright 2025 DXOS.org
//

import type { FC, PropsWithChildren } from 'react';

import { type GraphBuilder } from '@dxos/app-graph';
import { type RootSettingsStore } from '@dxos/local-storage';
import { type DeepReadonly } from '@dxos/util';

import { type PluginManager } from './manager';
import { defineEvent, defineInterface } from './plugin';
import { type LayoutParts, type Layout, type Resource } from '../common';
import { type IntentContext, type AnyIntentResolver } from '../plugin-intent';
import { type SurfaceDefinition } from '../plugin-surface';

//
// Common Capabilities
//

export namespace Capabilities {
  export const PluginManager = defineInterface<PluginManager>('dxos.org/app-framework/capabilities/plugin-manager');

  export const Null = defineInterface<null>('dxos.org/app-framework/contributions/null');

  export type ReactContext = Readonly<{ id: string; dependsOn?: string[]; context: FC<PropsWithChildren> }>;
  export const ReactContext = defineInterface<ReactContext>('dxos.org/app-framework/contributions/react-context');

  export type ReactRoot = Readonly<{ id: string; root: FC<PropsWithChildren> }>;
  export const ReactRoot = defineInterface<ReactRoot>('dxos.org/app-framework/contributions/react-root');

  export type ReactSurface = SurfaceDefinition | readonly SurfaceDefinition[];
  export const ReactSurface = defineInterface<ReactSurface>('dxos.org/app-framework/common/react-surface');

  export type IntentResolver = AnyIntentResolver | readonly AnyIntentResolver[];
  export const IntentResolver = defineInterface<IntentResolver>('dxos.org/app-framework/contributions/intent-resolver');

  export type IntentDispatcher = Readonly<Omit<IntentContext, 'registerResolver'>>;
  export const IntentDispatcher = defineInterface<IntentDispatcher>(
    'dxos.org/app-framework/contributions/intent-dispatcher',
  );

  export const SettingsStore = defineInterface<RootSettingsStore>(
    'dxos.org/app-framework/contributions/settings-store',
  );

  export type MutableSettings = { plugin: string; settings: Record<string, any> };
  export type Settings = DeepReadonly<MutableSettings>;
  export const Settings = defineInterface<Settings>('dxos.org/app-framework/contributions/settings');
  export const MutableSettings = defineInterface<MutableSettings>('dxos.org/app-framework/contributions/settings');

  export const Layout = defineInterface<Readonly<Layout>>('dxos.org/app-framework/contributions/layout');
  export const MutableLayout = defineInterface<Layout>('dxos.org/app-framework/contributions/layout');

  export type MutableLocation = { active: LayoutParts; closed: string[] };
  export type Location = DeepReadonly<MutableLocation>;
  export const Location = defineInterface<Location>('dxos.org/app-framework/contributions/location');
  export const MutableLocation = defineInterface<MutableLocation>('dxos.org/app-framework/contributions/location');

  export const Translations = defineInterface<Readonly<Resource[]>>(
    'dxos.org/app-framework/contributions/translations',
  );

  export const AppGraph = defineInterface<Readonly<Pick<GraphBuilder, 'graph' | 'explore'>>>(
    'dxos.org/app-framework/contributions/app-graph',
  );

  export const AppGraphBuilder = defineInterface<Parameters<GraphBuilder['addExtension']>[0]>(
    'dxos.org/app-framework/contributions/app-graph-builder',
  );
}

//
// Common Activation Events
//

export namespace Events {
  /**
   * Fired when the app is started.
   */
  export const Startup = defineEvent('dxos.org/app-framework/events/startup');

  //
  // Dependent Events
  //

  /**
   * Fired before the intent dispatcher is activated.
   */
  export const SetupIntents = defineEvent('dxos.org/app-framework/events/setup-intents');

  /**
   * Fired before the graph is created.
   */
  export const SetupGraph = defineEvent('dxos.org/app-framework/events/setup-graph');

  /**
   * Fired before the translations provider is created.
   */
  export const SetupTranslations = defineEvent('dxos.org/app-framework/events/setup-translations');

  //
  // Triggered Events
  //

  /**
   * Fired after the intent dispatcher is ready.
   */
  export const DispatcherReady = defineEvent('dxos.org/app-framework/events/dispatcher-ready');

  /**
   * Fired after the settings store is ready.
   */
  export const SettingsReady = defineEvent('dxos.org/app-framework/events/settings-ready');

  /**
   * Fired when the graph is ready.
   */
  export const GraphReady = defineEvent('dxos.org/app-framework/events/graph-ready');

  /**
   * Fired when plugin state is ready.
   */
  export const createStateEvent = (specifier: string) => defineEvent('dxos.org/app-framework/events/state', specifier);
  export const LayoutState = createStateEvent(Capabilities.Layout.identifier);
  export const LocationState = createStateEvent(Capabilities.Location.identifier);
}
