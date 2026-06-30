//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Atom } from '@effect-atom/atom-react';
import type * as Effect from 'effect/Effect';

import { type OllamaAdmin } from '@dxos/ai/resolvers';

/**
 * Reactive state of the local Ollama model installation, surfaced to the settings UI.
 */
export type ModelsState = {
  kind: 'idle' | 'loading' | 'ready' | 'failed';
  models: OllamaAdmin.Model[];
  /** Models currently loaded into memory (from `/api/ps`). */
  loaded: OllamaAdmin.RunningModel[];
  /** In-flight pulls keyed by model name. */
  pulls: Record<string, OllamaAdmin.PullProgress>;
  /** Per-model action errors (load/unload/remove/pull), keyed by model name, shown inline. */
  errors: Record<string, string>;
  /** Connection-level error reaching the service (no specific model). */
  error?: string;
};

/**
 * Stable, empty model state. Subscribed to when no sidecar manager is present (web/mobile) so a
 * reactive read keeps an unconditional hook order.
 */
export const emptyState: Atom.Atom<ModelsState> = Atom.make<ModelsState>({
  kind: 'idle',
  models: [],
  loaded: [],
  pulls: {},
  errors: {},
});

/**
 * Capability for managing locally-installed Ollama models. Implemented by the native (desktop)
 * plugin against the bundled sidecar; absent in the browser/mobile, where the UI renders nothing.
 */
export type Manager = {
  readonly endpoint: string;
  state: Atom.Writable<ModelsState>;
  /** List installed models (and currently-loaded models). Ensures the sidecar is running. */
  refresh: Effect.Effect<void>;
  /** Refresh only the currently-loaded models; cheap, for polling while a chat runs. */
  refreshLoaded: Effect.Effect<void>;
  pull: (name: string) => Effect.Effect<void>;
  /** Abort an in-flight pull, leaving any already-downloaded layers in place. */
  cancel: (name: string) => Effect.Effect<void>;
  /** Load a model into memory (kept resident until unloaded). */
  load: (name: string) => Effect.Effect<void>;
  /** Unload a model from memory. */
  unload: (name: string) => Effect.Effect<void>;
  remove: (name: string) => Effect.Effect<void>;
};
