//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { type OllamaAdmin } from '@dxos/ai/resolvers';

/**
 * Reactive state of the local Ollama model installation, surfaced to the settings UI.
 */
export type ModelsState = {
  kind: 'idle' | 'loading' | 'ready' | 'failed';
  models: OllamaAdmin.Model[];
  /** In-flight pulls keyed by model name. */
  pulls: Record<string, OllamaAdmin.PullProgress>;
  error?: string;
};

/**
 * Capability for managing locally-installed Ollama models. Implemented by the native (desktop)
 * plugin against the bundled sidecar; absent in the browser/mobile, where the UI renders nothing.
 */
export type Manager = {
  readonly endpoint: string;
  state: Atom.Writable<ModelsState>;
  refresh: () => Promise<void>;
  pull: (name: string) => Promise<void>;
  /** Abort an in-flight pull, leaving any already-downloaded layers in place. */
  cancel: (name: string) => void;
  remove: (name: string) => Promise<void>;
};
