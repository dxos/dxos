//
// Copyright 2025 DXOS.org
//

import { type FC } from 'react';

import { type FallbackProps } from '@dxos/react-error-boundary';

import { type ActivationEvent } from '../../core';
import { type Plugin, type PluginManager } from '../../core';

// Types used by both `useApp.tsx` and the `<App />` component. Defining them
// here (rather than alongside the `useApp` hook) keeps `App.tsx` from having
// to type-import the hook module, which paired with the hook's runtime
// import of `App.tsx` formed a cycle that webkit's strict TDZ refused to
// honour. See `./useApp.tsx` for the wider explanation.

export type StartupProgress = {
  /** Number of modules that have been activated. */
  activated: number;
  /** Total number of modules registered. */
  total: number;
  /** Fractional progress (0-1). */
  progress: number;
  /**
   * Raw activation event key (e.g. `org.dxos.app-framework.event.startup`).
   * Set on event-level transitions, *and* on module-level transitions where
   * it carries the parent activation event that first triggered the
   * module's load (plumbed through `_loadCapabilitiesForModules` →
   * `_loadModule`). Consumers can use this either as the primary id (when
   * {@link module} is absent) or as an extra "context" field alongside
   * {@link module}.
   */
  event?: string;
  /**
   * Raw module id (e.g. `org.dxos.plugin.observability.module.ReactSurface`)
   * when the in-flight activation is module-level. When present,
   * {@link event} may also be set, identifying the parent activation that
   * triggered this module's load.
   */
  module?: string;
  /**
   * Pre-humanized label for the currently surfaced transition (module
   * label if {@link module} is set, otherwise the event label), supplied
   * for consumers that want a sensible default. Hosts that prefer to
   * render their own label can read the raw {@link event}/{@link module}
   * fields and ignore this — the framework leaves the policy choice
   * (which transitions to surface, how to format them, whether to drop
   * sub-modules entirely) to the host's `Placeholder`.
   */
  humanizedName?: string;
};

export type PlaceholderProps = {
  stage?: number;
  progress?: StartupProgress;
};

export type UseAppOptions = {
  pluginManager?: PluginManager.PluginManager;
  pluginLoader?: PluginManager.ManagerOptions['pluginLoader'];
  onPluginRemove?: PluginManager.ManagerOptions['onRemove'];
  plugins?: Plugin.Plugin[];
  core?: string[];
  defaults?: string[];
  /**
   * Additional activation events to fire before startup.
   * These are fired alongside SetupReactSurface before the Startup event.
   */
  setupEvents?: ActivationEvent.ActivationEvent[];
  cacheEnabled?: boolean;
  safeMode?: boolean;
  debounce?: number;
  timeout?: number;
  fallback?: FC<FallbackProps>;
  placeholder?: FC<PlaceholderProps>;
};
