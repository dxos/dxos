//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useState } from 'react';

import { getTextContent, TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { Tooltip, useThemeContext } from '@dxos/react-ui';
import { textBlockWidth } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Toolbar } from './Toolbar';
import {
  decorateMarkdown,
  comments,
  formatting,
  image,
  table,
  useComments,
  useFormattingState,
  createMarkdownExtensions,
} from '../../extensions';
import {
  type Comment,
  createBasicExtensions,
  createThemeExtensions,
  useActionHandler,
  useTextEditor,
} from '../../hooks';
import translations from '../../translations';

faker.seed(101);

const Story: FC<{ id?: string; content: string }> = ({ id = 'test', content }) => {
  const { themeMode } = useThemeContext();
  const [item] = useState({ text: new TextObject(content) });
  const [formattingState, formattingObserver] = useFormattingState();
  const { parentRef, view } = useTextEditor({
    doc: getTextContent(item.text),
    extensions: [
      createBasicExtensions(),
      createMarkdownExtensions({ themeMode }),
      createThemeExtensions({ themeMode, slots: { editor: { className: 'p-2' } } }),
      comments({
        onCreate: ({ cursor }) => {
          const id = PublicKey.random().toHex();
          setComments((comments) => [...comments, { id, cursor }]);
          return id;
        },
      }),
      decorateMarkdown(),
      formatting(),
      image(),
      table(),
      formattingObserver,
    ],
  });

  const [_comments, setComments] = useState<Comment[]>([]);
  useComments(view, id, _comments);

  const handleAction = useActionHandler(view);

  return (
    <div role='none' className='fixed inset-0 flex flex-col'>
      <Toolbar.Root onAction={handleAction} state={formattingState} classNames={textBlockWidth}>
        <Toolbar.Markdown />
        <Toolbar.Separator />
        <Toolbar.Extended />
      </Toolbar.Root>
      <div ref={parentRef} className={textBlockWidth} />;
    </div>
  );
};

export default {
  title: 'react-ui-editor/Toolbar',
  component: Toolbar,
  render: (args: any) => (
    <Tooltip.Provider>
      <Story {...args} />
    </Tooltip.Provider>
  ),
  decorators: [withTheme],
  parameters: { translations, layout: 'fullscreen' },
};

const content = [
  '# Demo',
  '',
  'The editor supports **Markdown** styles.',
  '',
  faker.lorem.paragraph({ min: 5, max: 8 }),
  '',
  '',
].join('\n');

export const Default = {
  args: {
    content,
  },
};
