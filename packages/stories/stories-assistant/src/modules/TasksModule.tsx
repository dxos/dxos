//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { Filter, Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  outliner,
} from '@dxos/ui-editor';

export const TasksModule = () => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }

  return <TasksModuleContainer space={space} />;
};

const TasksModuleContainer = ({ space }: { space: Space }) => {
  const themeMode = Hooks.useThemeMode();
  const [document] = useQuery(space.db, Filter.type(Markdown.Document));
  if (!document?.content.target) {
    return null;
  }

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root classNames='border-b border-separator-subtle'>
          <Toolbar.Text>{Obj.getLabel(document)}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
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
      </Panel.Body>
    </Panel.Root>
  );
};
