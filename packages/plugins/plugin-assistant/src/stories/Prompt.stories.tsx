//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { PromptBar, type PromptBarProps } from '../components';
import { type Expression, QueryParser } from '../parser';
import { translations } from '../translations';

const DefaultStory = (props: PromptBarProps) => {
  const [ast, setAst] = useState<Expression>();
  const handleSubmit = useCallback<NonNullable<PromptBarProps['onSubmit']>>((text) => {
    const parser = new QueryParser(text);
    const ast = parser.parse();
    setAst(ast);
  }, []);

  return (
    <div className='flex flex-col w-[40rem] border border-separator rounded-md'>
      <PromptBar {...props} onSubmit={handleSubmit} />
      <JsonFilter data={{ ast }} />
    </div>
  );
};

const meta: Meta<typeof PromptBar> = {
  title: 'plugins/plugin-assistant/QueryPrompt',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [],
    }),
    withTheme,
    withLayout({
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
  parameters: {
    translations,
    layout: 'centered',
    controls: { disable: true },
  },
};

type Story = StoryObj<typeof PromptBar>;

export default meta;

export const Default: Story = {
  args: {},
};
