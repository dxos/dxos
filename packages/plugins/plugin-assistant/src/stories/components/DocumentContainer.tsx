//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

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
  createThemeExtensions,
  outliner,
} from '@dxos/react-ui-editor';

import { type ComponentProps } from './types';

export const DocumentContainer = ({ space }: ComponentProps) => {
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
        text={document.content.target}
        classNames='h-full p-2 overflow-hidden'
        extensions={[
          // TODO(burdon): Create util.
          createDataExtensions({ id: document.id, text: createDocAccessor(document.content.target, ['content']) }),
          createBasicExtensions({ readOnly: false }),
          createMarkdownExtensions({ themeMode }),
          createThemeExtensions({ themeMode }),
          outliner(),
        ]}
      />
    </>
  );
};
