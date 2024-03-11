//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { Tooltip, useThemeContext } from '@dxos/react-ui';
import { textBlockWidth } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Toolbar } from './Toolbar';
import {
  type Comment,
  decorateMarkdown,
  comments,
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  formattingKeymap,
  table,
  useComments,
  useFormattingState,
  createMarkdownExtensions,
  image,
} from '../../extensions';
import { useActionHandler, useDocAccessor, useTextEditor } from '../../hooks';
import translations from '../../translations';

faker.seed(101);

const Story: FC<{ content: string }> = ({ content }) => {
  const { themeMode } = useThemeContext();
  const [item] = useState({ text: new TextObject(content) });
  const { id, doc, accessor } = useDocAccessor(item.text);
  const [formattingState, formattingObserver] = useFormattingState();
  const { parentRef, view } = useTextEditor(
    () => ({
      id,
      doc,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, slots: { editor: { className: 'p-2' } } }),
        createDataExtensions({ id, text: accessor }),
        comments({
          onCreate: ({ cursor }) => {
            const id = PublicKey.random().toHex();
            setComments((comments) => [...comments, { id, cursor }]);
            return id;
          },
        }),
        decorateMarkdown(),
        formattingKeymap(),
        image(),
        table(),
        formattingObserver,
      ],
    }),
    [id, accessor, themeMode],
  );

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
      <div role='textbox' ref={parentRef} className={textBlockWidth} />;
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
