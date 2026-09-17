//
// Copyright 2026 DXOS.org
//

import { defineCatalog } from './catalog.ts';
import { defineModel } from './model.ts';

export const opus = defineModel({
  id: 'com.anthropic.model.claude-opus-5',
  label: 'Claude Opus 5',
  contextWindow: 200_000,
  capabilities: ['tools', 'thinking', 'image', 'documents', 'structuredOutput'],
});

export const haiku = defineModel({
  id: 'com.anthropic.model.claude-haiku-4-5',
  label: 'Claude Haiku 4.5',
  contextWindow: 200_000,
  capabilities: ['tools', 'image'],
});

export const embedded = defineModel({
  id: 'com.meta.model.llama-3-2-1b',
  label: 'Llama 3.2 1B',
  contextWindow: 8_192,
  capabilities: [],
});

export const catalog = defineCatalog([opus, haiku, embedded]);
