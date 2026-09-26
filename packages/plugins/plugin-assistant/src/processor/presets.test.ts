//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Model, Provider } from '@dxos/ai';
import { DXN } from '@dxos/keys';

import { DEFAULT_MODEL, pickPreset, presetsForProvider, providerForModel } from './presets.ts';

describe('providerForModel', () => {
  test('keeps the active provider when it serves the model', ({ expect }) => {
    // The same local model id is served by the sidecar, an external Ollama and LM Studio, so the
    // live one must win over the catalog's first entry.
    const llama = DXN.make('com.meta.model.llama-3-2-1b.instruct');
    expect(providerForModel(llama, Provider.ollama.id)).toBe(Provider.ollama.id);
    expect(providerForModel(llama, Provider.lmStudio.id)).toBe(Provider.lmStudio.id);
    expect(providerForModel(Model.claudeSonnet5.id, Provider.edge.id)).toBe(Provider.edge.id);
  });

  test('falls back to a provider that serves the model when the active one does not', ({ expect }) => {
    // A chat that selected an edge model while the user is now offline: the request must still be
    // addressed to the provider serving that model, not to the one settings currently name.
    expect(providerForModel(Model.claudeSonnet5.id, Provider.ollama.id)).toBe(Provider.edge.id);
    expect(providerForModel(DXN.make('com.meta.model.llama-3-2-1b.instruct'), Provider.edge.id)).toBe(
      Provider.builtIn.id,
    );
  });

  test('leaves an uncurated model with the active provider', ({ expect }) => {
    const unknown = DXN.make('com.example.model.mystery.default');
    expect(providerForModel(unknown, Provider.edge.id)).toBe(Provider.edge.id);
    expect(providerForModel(unknown, undefined)).toBeUndefined();
  });
});

describe('pickPreset', () => {
  test('defaults edge chats to Sonnet when settings name no model', ({ expect }) => {
    expect(DEFAULT_MODEL).toBe(Model.claudeSonnet5.id);
    expect(pickPreset(presetsForProvider(Provider.edge.id))?.model).toBe(Model.claudeSonnet5.id);
  });

  test('prefers the configured default over the built-in one', ({ expect }) => {
    const presets = presetsForProvider(Provider.edge.id);
    expect(pickPreset(presets, Model.claudeOpus5.id)?.model).toBe(Model.claudeOpus5.id);
  });

  test('falls back to the first preset for a provider that does not serve the default', ({ expect }) => {
    const presets = presetsForProvider(Provider.ollama.id);
    expect(pickPreset(presets)?.model).toBe(presets[0]?.model);
  });
});
