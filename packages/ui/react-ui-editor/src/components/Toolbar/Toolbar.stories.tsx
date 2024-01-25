//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';
import type { EditorView } from '@codemirror/view';
import React, { useMemo, useRef, useState } from 'react';

import { TextObject } from '@dxos/echo-schema';
import { fixedInsetFlexLayout, groupSurface, mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Toolbar, type ToolbarProps } from './Toolbar';
import { toggleBold, formatting } from '../../extensions';
import { useTextModel } from '../../hooks';
import { MarkdownEditor } from '../TextEditor';

const content = 'Heading\n\nThis is some **sample** text!\n\nSome more.\n';

const Story = () => {
  const [item] = useState({ text: new TextObject(content) });
  // const [comments, setComments] = useState<Comment[]>([]);
  const view = useRef<EditorView>(null);
  const model = useTextModel({ text: item.text });
  const extensions = useMemo(() => [formatting()], []);
  // useComments(view.current, comments);
  if (!model) {
    return null;
  }

  const handleAction: ToolbarProps['onAction'] = (action) => {
    console.log(action);
    if (view.current) {
      switch (action.type) {
        case 'heading':
          break;
        case 'bold':
          toggleBold(view.current);
          break;
      }
    }
  };

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
