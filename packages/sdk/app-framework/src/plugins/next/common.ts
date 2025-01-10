//
// Copyright 2025 DXOS.org
//

import type { FC, PropsWithChildren } from 'react';

import { type GraphBuilder } from '@dxos/app-graph';
import { type S } from '@dxos/echo-schema';
import { type RootSettingsStore } from '@dxos/local-storage';
import { type DeepReadonly } from '@dxos/util';

import { type PluginManager } from './manager';
import { defineEvent, defineCapability } from './plugin';
import { type LayoutParts, type Layout, type Resource, type NodeSerializer } from '../common';
import { type IntentContext, type AnyIntentResolver } from '../plugin-intent';
import { type SurfaceDefinition } from '../plugin-surface';

//
// Common Capabilities
//

export namespace Capabilities {
  export const PluginManager = defineCapability<PluginManager>('dxos.org/app-framework/capabilities/plugin-manager');

  export const Null = defineCapability<null>('dxos.org/app-framework/capabilities/null');

  export type ReactContext = Readonly<{ id: string; dependsOn?: string[]; context: FC<PropsWithChildren> }>;
  export const ReactContext = defineCapability<ReactContext>('dxos.org/app-framework/capabilities/react-context');

  export type ReactRoot = Readonly<{ id: string; root: FC<PropsWithChildren> }>;
  export const ReactRoot = defineCapability<ReactRoot>('dxos.org/app-framework/capabilities/react-root');

  export type ReactSurface = SurfaceDefinition | readonly SurfaceDefinition[];
  export const ReactSurface = defineCapability<ReactSurface>('dxos.org/app-framework/common/react-surface');

  export type IntentResolver = AnyIntentResolver | readonly AnyIntentResolver[];
  export const IntentResolver = defineCapability<IntentResolver>('dxos.org/app-framework/capabilities/intent-resolver');

  export type IntentDispatcher = Readonly<Omit<IntentContext, 'registerResolver'>>;
  export const IntentDispatcher = defineCapability<IntentDispatcher>(
    'dxos.org/app-framework/capabilities/intent-dispatcher',
  );

  export const Layout = defineCapability<Readonly<Layout>>('dxos.org/app-framework/capabilities/layout');
  export const MutableLayout = defineCapability<Layout>('dxos.org/app-framework/capabilities/layout');

  export type MutableLocation = { active: LayoutParts; closed: string[] };
  export type Location = DeepReadonly<MutableLocation>;
  export const Location = defineCapability<Location>('dxos.org/app-framework/capabilities/location');
  export const MutableLocation = defineCapability<MutableLocation>('dxos.org/app-framework/capabilities/location');

  export const Translations = defineCapability<Readonly<Resource[]>>(
    'dxos.org/app-framework/capabilities/translations',
  );

  export const AppGraph = defineCapability<Readonly<Pick<GraphBuilder, 'graph' | 'explore'>>>(
    'dxos.org/app-framework/capabilities/app-graph',
  );

  export const AppGraphBuilder = defineCapability<Parameters<GraphBuilder['addExtension']>[0]>(
    'dxos.org/app-framework/capabilities/app-graph-builder',
  );

  export const AppGraphSerializer = defineCapability<NodeSerializer[]>(
    'dxos.org/app-framework/capabilities/app-graph-serializer',
  );

  export const SettingsStore = defineCapability<RootSettingsStore>(
    'dxos.org/app-framework/capabilities/settings-store',
  );

  // TODO(wittjosiah): The generics caused type inference issues for schemas when contributing settings.
  // export type Settings = Parameters<RootSettingsStore['createStore']>[0];
  // export type Settings<T extends SettingsValue = SettingsValue> = SettingsProps<T>;
  export type Settings = {
    schema: S.Schema.All;
    prefix: string;
    value?: Record<string, any>;
  };
  export const Settings = defineCapability<Settings>('dxos.org/app-framework/capabilities/settings');

  export type Metadata = Readonly<{ id: string; metadata: Record<string, any> }>;
  export const Metadata = defineCapability<Metadata>('dxos.org/app-framework/capabilities/metadata');
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
   * Fired before the settings store is activated.
   */
  export const SetupSettings = defineEvent('dxos.org/app-framework/events/setup-settings');

  /**
   * Fired before the graph is created.
   */
  export const SetupAppGraph = defineEvent('dxos.org/app-framework/events/setup-graph');

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
  export const AppGraphReady = defineEvent('dxos.org/app-framework/events/graph-ready');

  /**
   * Fired when plugin state is ready.
   */
  export const createStateEvent = (specifier: string) => defineEvent('dxos.org/app-framework/events/state', specifier);
  export const LayoutReady = createStateEvent(Capabilities.Layout.identifier);
  export const LocationReady = createStateEvent(Capabilities.Location.identifier);
}
