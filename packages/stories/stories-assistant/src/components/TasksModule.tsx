//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter, Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { Markdown } from '@dxos/plugin-markdown';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Panel, Toolbar, useThemeContext } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  outliner,
} from '@dxos/ui-editor';

export const TasksModule = ({ space }: { space: Space }) => {
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
      <Panel.Content>
        <Editor.Root>
          <Editor.View
            id={document.id}
            classNames='h-full p-2 overflow-hidden'
            extensions={[
              createThemeExtensions({ themeMode }),
              createDataExtensions({ id: document.id, text: Doc.createAccessor(document.content.target, ['content']) }),
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
