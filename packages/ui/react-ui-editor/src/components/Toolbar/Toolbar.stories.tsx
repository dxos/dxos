//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useMemo, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { faker } from '@dxos/random';
import { fixedInsetFlexLayout, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Toolbar } from './Toolbar';
import { code, comments, formatting, heading, image, table, tasklist, useComments } from '../../extensions';
import { type Comment, useActionHandler, useEditorView, useTextModel } from '../../hooks';
import { MarkdownEditor } from '../TextEditor';

faker.seed(101);

const Story: FC<{ content: string }> = ({ content }) => {
  const [item] = useState({ text: new TextObject(content) });
  const [_comments, setComments] = useState<Comment[]>([]);
  const [editorRef, editorView] = useEditorView();
  const model = useTextModel({ text: item.text });
  const extensions = useMemo(
    () => [
      code(),
      comments({
        onCreate: (cursor) => {
          const id = PublicKey.random().toHex();
          setComments((comments) => [...comments, { id, cursor }]);
          return id;
        },
      }),
      formatting(),
      heading(),
      image(),
      table(),
      tasklist(),
    ],
    [],
  );

  useComments(editorView, _comments);
  const handleAction = useActionHandler(editorView);

  if (!model) {
    return null;
  }

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex h-full justify-center'>
        <div className='flex flex-col h-full w-[800px]'>
          <Toolbar.Root onAction={handleAction}>
            <Toolbar.Markdown />
            <Toolbar.Separator />
            <Toolbar.Extended />
          </Toolbar.Root>
          <MarkdownEditor ref={editorRef} model={model} extensions={extensions} />
        </div>
      </div>
    </div>
  );
};

export default {
  title: 'react-ui-editor/Toolbar',
  component: Toolbar,
  render: (args: any) => <Story {...args} />,
  decorators: [withTheme],
};

const content = [
  'Demo',
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
