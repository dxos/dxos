//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { type Meta, type StoryObj } from '@storybook/react-vite';
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
  refresh: async () => {},
  pull: async () => {},
  cancel: () => {},
  remove: async () => {},
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
    state: { kind: 'ready', models: [], pulls: {} },
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
      pulls: {},
    },
  },
};

export const Pulling: Story = {
  args: {
    state: {
      kind: 'ready',
      models: [{ name: 'llama3.2:1b', size: 1_321_098_329 }],
      pulls: {
        'gpt-oss:20b': { status: 'downloading', completed: 4_200_000_000, total: 13_000_000_000 },
      },
    },
  },
};

export const Failed: Story = {
  args: {
    state: {
      kind: 'failed',
      models: [],
      pulls: {},
      error: 'Connection refused',
    },
  },
};
