//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Form } from '@dxos/react-ui-form';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type Ollama } from '#types';

import { OllamaModelsSection } from './OllamaModels';

// In-memory manager that bypasses the (desktop-only) capability lookup; methods are no-ops so the
// configured state is what renders.
const makeFakeManager = (state: Ollama.ModelsState): Ollama.Manager => ({
  endpoint: 'http://localhost:21434',
  state: Atom.make(state),
  refresh: Effect.void,
  refreshLoaded: Effect.void,
  pull: () => Effect.void,
  cancel: () => Effect.void,
  load: () => Effect.void,
  unload: () => Effect.void,
  remove: () => Effect.void,
});

const Render = ({ state }: { state: Ollama.ModelsState }) => {
  const manager = useMemo(() => makeFakeManager(state), [state]);
  return (
    <Form.Root schema={Schema.Struct({})} values={{}} variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <OllamaModelsSection manager={manager} />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/containers/OllamaModels',
  render: Render,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof Render>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    state: { kind: 'ready', models: [], loaded: [], pulls: {}, errors: {} },
  },
};

export const Populated: Story = {
  args: {
    state: {
      kind: 'ready',
      models: [
        { name: 'llama3.2:1b', size: 1_321_098_329 },
        { name: 'qwen2.5:14b', size: 9_001_234_567 },
      ],
      // llama3.2:1b is currently loaded into memory.
      loaded: [{ name: 'llama3.2:1b', sizeVram: 1_400_000_000 }],
      pulls: {},
      // A per-model action error shows inline on its row.
      errors: { 'qwen2.5:14b': 'error starting llama-server: not enough memory' },
    },
  },
};

export const Pulling: Story = {
  args: {
    state: {
      kind: 'ready',
      models: [{ name: 'llama3.2:1b', size: 1_321_098_329 }],
      loaded: [],
      pulls: {
        'gpt-oss:20b': { status: 'downloading', completed: 4_200_000_000, total: 13_000_000_000 },
      },
      errors: {},
    },
  },
};

export const Failed: Story = {
  args: {
    state: {
      kind: 'failed',
      models: [],
      loaded: [],
      pulls: {},
      errors: {},
      error: 'Connection refused',
    },
  },
};
