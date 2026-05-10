//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { ToolResults } from './ToolResults';

const meta: Meta<typeof ToolResults> = {
  title: 'ui/react-ui-introspect/ToolResults',
  component: ToolResults,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof ToolResults>;

// Mirrors the deployed introspect-mcp shape: top-level object whose values
// are arrays of objects. The buggy renderer printed
// `[object Object], [object Object], …` for these.
const listPluginsEnvelope = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        plugins: [
          { id: 'org.dxos.plugin.assistant', package: '@dxos/plugin-assistant' },
          { id: 'org.dxos.plugin.markdown', package: '@dxos/plugin-markdown' },
          { id: 'org.dxos.plugin.code', package: '@dxos/plugin-code' },
        ],
      }),
    },
  ],
  structuredContent: {
    plugins: [
      { id: 'org.dxos.plugin.assistant', package: '@dxos/plugin-assistant' },
      { id: 'org.dxos.plugin.markdown', package: '@dxos/plugin-markdown' },
      { id: 'org.dxos.plugin.code', package: '@dxos/plugin-code' },
    ],
  },
};

const findSymbolEnvelope = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        matches: [
          { ref: '@dxos/echo#Expando', package: '@dxos/echo', name: 'Expando', kind: 'class' },
          { ref: '@dxos/echo#ExpandoSchema', package: '@dxos/echo', name: 'ExpandoSchema', kind: 'variable' },
        ],
      }),
    },
  ],
  structuredContent: {
    matches: [
      { ref: '@dxos/echo#Expando', package: '@dxos/echo', name: 'Expando', kind: 'class' },
      { ref: '@dxos/echo#ExpandoSchema', package: '@dxos/echo', name: 'ExpandoSchema', kind: 'variable' },
    ],
  },
};

const primitiveArrayEnvelope = {
  content: [{ type: 'text', text: JSON.stringify({ tags: ['alpha', 'beta', 'gamma'] }) }],
  structuredContent: { tags: ['alpha', 'beta', 'gamma'] },
};

// `get_package` returns a single record under a singular key — the wrapper
// should be peeled so the package's fields render directly.
const getPackageEnvelope = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        package: {
          name: '@dxos/echo',
          version: '0.8.3',
          private: false,
          path: 'packages/core/echo/echo',
          description: 'DXOS object graph / local-first DB.',
        },
      }),
    },
  ],
  structuredContent: {
    package: {
      name: '@dxos/echo',
      version: '0.8.3',
      private: false,
      path: 'packages/core/echo/echo',
      description: 'DXOS object graph / local-first DB.',
    },
  },
};

export const GetPackage: Story = { args: { result: getPackageEnvelope } };
export const ListPlugins: Story = { args: { result: listPluginsEnvelope } };
export const FindSymbol: Story = { args: { result: findSymbolEnvelope } };
export const PrimitiveArray: Story = { args: { result: primitiveArrayEnvelope } };
export const ListPluginsDebug: Story = { args: { result: listPluginsEnvelope, debug: true } };
export const ContentOnly: Story = {
  args: { result: { content: [{ type: 'text', text: JSON.stringify({ plugins: [{ id: 'a' }, { id: 'b' }] }) }] } },
};
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = { args: {} };
export const ErrorMessage: Story = { args: { error: new Error('Connection refused') } };
