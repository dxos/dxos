//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';
import type { EditorView } from '@codemirror/view';
import React, { useMemo, useRef, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { fixedInsetFlexLayout, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Toolbar, type ToolbarProps } from './Toolbar';
import {
  comments,
  createComment,
  formatting,
  setHeading,
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  useComments,
} from '../../extensions';
import { type Comment, useTextModel } from '../../hooks';
import { MarkdownEditor } from '../TextEditor';

const content = 'Heading\n\nThis is some **sample** text!\n\nSome more.\n';

const Story = () => {
  const [item] = useState({ text: new TextObject(content) });
  const [_comments, setComments] = useState<Comment[]>([]);
  const view = useRef<EditorView>(null);
  const model = useTextModel({ text: item.text });
  const extensions = useMemo(
    () => [
      comments({
        onCreate: (cursor) => {
          const id = PublicKey.random().toHex();
          setComments((comments) => [...comments, { id, cursor }]);
          return id;
        },
      }),
      formatting(),
    ],
    [],
  );

  useComments(view.current, _comments);

  // TODO(burdon): Restore cursor position after clicking toolbar.
  const handleAction: ToolbarProps['onAction'] = (action) => {
    if (view.current) {
      switch (action.type) {
        case 'heading':
          setHeading(parseInt(action.data))(view.current);
          break;

        case 'bold':
          toggleBold(view.current);
          break;
        case 'italic':
          toggleItalic(view.current);
          break;
        case 'strikethrough':
          toggleStrikethrough(view.current);
          break;

        // TODO(burdon): Other actions.

        case 'comment':
          createComment(view.current);
          break;
      }
    }
  };

  if (!model) {
    return null;
  }

  return (
    <div className={mx(fixedInsetFlexLayout, groupSurface)}>
      <div className='flex h-full justify-center'>
        <div className='flex flex-col h-full w-[800px] gap-4'>
          <Toolbar onAction={handleAction} />
          <MarkdownEditor ref={view} model={model} extensions={extensions} />
        </div>
      </div>
    </div>
  );
};

export default {
  title: 'react-ui-editor/Toolbar',
  component: Toolbar,
  render: Story,
  decorators: [withTheme],
};

export const Default = {};
