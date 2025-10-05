//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';

import { useThemeContext } from '@dxos/react-ui';
import { trim } from '@dxos/util';

import {
  type XmlWidgetRegistry,
  type XmlWidgetState,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  extendedMarkdown,
  xmlTags,
} from '../extensions';
import { useTextEditor } from '../hooks';

const registry = {
  // <test/>
  ['test' as const]: {
    block: true,
    Component: () => <div className='p-2 border border-separator rounded'>Test</div>,
  },
} satisfies XmlWidgetRegistry;

const DefaultStory = ({ text }: { text?: string }) => {
  const { themeMode } = useThemeContext();
  const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);
  const { parentRef } = useTextEditor({
    initialValue: text,
    extensions: [
      createThemeExtensions({ themeMode }),
      createBasicExtensions({ lineWrapping: true, readOnly: true }),
      decorateMarkdown(),
      extendedMarkdown({ registry }),
      xmlTags({ registry, setWidgets }),
    ],
  });

  return (
    <>
      <div ref={parentRef} className='is-full p-4' />
      {widgets.map(({ Component, root, id, ...props }) => (
        <div key={id}>{createPortal(<Component {...props} />, root)}</div>
      ))}
    </>
  );
};

const text = trim`
  # Tags

  <test id="123" />

  React widget above.
`;

const meta = {
  title: 'ui/react-ui-editor/Tags',
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text,
  },
};
