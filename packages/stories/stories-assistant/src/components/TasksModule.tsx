//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter, Obj } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { Markdown } from '@dxos/plugin-markdown';
import { useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useThemeContext } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  outliner,
} from '@dxos/ui-editor';

import { type ModuleProps } from './types';

export const TasksModule = ({ space }: ModuleProps) => {
  const { themeMode } = useThemeContext();
  const [document] = useQuery(space.db, Filter.type(Markdown.Document));
  if (!document?.content.target) {
    return null;
  }

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='border-b border-subdued-separator'>
          <Toolbar.Text>{Obj.getLabel(document)}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Editor.Root>
          <Editor.View
            id={document.id}
            classNames='h-full p-2 overflow-hidden'
            extensions={[
              createThemeExtensions({ themeMode }),
              createDataExtensions({ id: document.id, text: createDocAccessor(document.content.target, ['content']) }),
              createBasicExtensions({ readOnly: false }),
              createMarkdownExtensions(),
              outliner(),
            ]}
          />
        </Editor.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
