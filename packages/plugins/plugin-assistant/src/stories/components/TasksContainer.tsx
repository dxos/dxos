//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter, Obj } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown/types';
import { createDocAccessor, useQuery } from '@dxos/react-client/echo';
import { Toolbar, useThemeContext } from '@dxos/react-ui';
import {
  Editor,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  outliner,
} from '@dxos/react-ui-editor';

import { type ComponentProps } from './types';

export const TasksContainer = ({ space }: ComponentProps) => {
  const { themeMode } = useThemeContext();
  const [document] = useQuery(space, Filter.type(Markdown.Document));
  if (!document?.content.target) {
    return null;
  }

  return (
    <>
      <Toolbar.Root classNames='border-b border-subduedSeparator'>
        <h2>{Obj.getLabel(document)}</h2>
      </Toolbar.Root>
      <Editor
        id={document.id}
        classNames='h-full p-2 overflow-hidden'
        extensions={[
          createDataExtensions({ id: document.id, text: createDocAccessor(document.content.target, ['content']) }),
          createBasicExtensions({ readOnly: false }),
          createMarkdownExtensions(),
          outliner(),
        ]}
      />
    </>
  );
};
