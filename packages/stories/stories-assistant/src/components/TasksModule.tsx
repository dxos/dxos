//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Filter, Obj } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { Markdown } from '@dxos/plugin-markdown/types';
import { useQuery } from '@dxos/react-client/echo';
import { Toolbar, useThemeContext } from '@dxos/react-ui';
import { EditorContent } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  outliner,
} from '@dxos/ui-editor';

import { type ComponentProps } from './types';

export const TasksModule = ({ space }: ComponentProps) => {
  const { themeMode } = useThemeContext();
  const [document] = useQuery(space.db, Filter.type(Markdown.Document));
  if (!document?.content.target) {
    return null;
  }

  return (
    <>
      <Toolbar.Root classNames='border-be border-subduedSeparator'>
        <h2>{Obj.getLabel(document)}</h2>
      </Toolbar.Root>
      <EditorContent
        id={document.id}
        classNames='bs-full p-2 overflow-hidden'
        extensions={[
          createThemeExtensions({ themeMode }),
          createDataExtensions({ id: document.id, text: createDocAccessor(document.content.target, ['content']) }),
          createBasicExtensions({ readOnly: false }),
          createMarkdownExtensions(),
          outliner(),
        ]}
      />
    </>
  );
};
