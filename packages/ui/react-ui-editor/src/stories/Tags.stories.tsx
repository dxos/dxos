//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import {
  type XmlWidgetRegistry,
  type XmlWidgetState,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  extendedMarkdown,
  xmlTags,
} from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { useTextEditor } from '../hooks';

const registry = {
  /**
   * Custom tag: <test/>
   */
  ['test' as const]: {
    block: true,
    Component: () => {
      const [count, setCount] = useState(0);
      useEffect(() => {
        const interval = setInterval(() => {
          setCount((prev) => prev + 1);
        }, 1_000);
        return () => clearInterval(interval);
      }, []);

      return <div className='p-2 border border-separator rounded'>Test {count}</div>;
    },
  },
} satisfies XmlWidgetRegistry;

const DefaultStory = ({ text }: { text?: string }) => {
  const { themeMode } = useThemeContext();
  const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);
  const { parentRef } = useTextEditor({
    initialValue: text,
    extensions: [
      createThemeExtensions({ themeMode }),
      createBasicExtensions({ lineWrapping: true }),
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

  React widget below.

  <test id="123" />

  React widget above.
`;

const meta = {
  title: 'ui/react-ui-editor/XmlTags',
  render: DefaultStory,
  decorators: [withTheme],
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
