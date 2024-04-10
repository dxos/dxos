//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useState } from 'react';

import { TextV0Type } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { Tooltip, useThemeContext } from '@dxos/react-ui';
import { textBlockWidth } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Toolbar } from './Toolbar';
import {
  type Comment,
  comments,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  formattingKeymap,
  image,
  table,
  useComments,
  useFormattingState,
} from '../../extensions';
import { useActionHandler, useTextEditor } from '../../hooks';
import translations from '../../translations';

faker.seed(101);

const Story: FC<{ content: string }> = ({ content }) => {
  const { themeMode } = useThemeContext();
  const [text] = useState(E.object(TextV0Type, { content }));
  const id = text.id;
  const doc = text.content;
  const accessor = E.getRawDoc(text);
  const [formattingState, formattingObserver] = useFormattingState();
  const { parentRef, view } = useTextEditor(() => {
    return {
      id,
      doc,
      extensions: [
        formattingObserver,
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
      ],
    };
  }, [id, accessor, formattingObserver, themeMode]);

  const handleAction = useActionHandler(view);

  const [_comments, setComments] = useState<Comment[]>([]);
  useComments(view, id, _comments);

  return (
    <Tooltip.Provider>
      <div role='none' className='fixed inset-0 flex flex-col'>
        <Toolbar.Root onAction={handleAction} state={formattingState} classNames={textBlockWidth}>
          <Toolbar.Markdown />
          <Toolbar.Custom onUpload={async (file) => ({ url: file.name })} />
          <Toolbar.Separator />
          <Toolbar.Actions />
        </Toolbar.Root>
        <div ref={parentRef} className={textBlockWidth} />
      </div>
    </Tooltip.Provider>
  );
};

export default {
  title: 'react-ui-editor/Toolbar',
  component: Toolbar,
  decorators: [withTheme],
  parameters: { translations, layout: 'fullscreen' },
  render: (args: any) => <Story {...args} />,
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
