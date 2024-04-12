//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { TextV0Type } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  formattingKeymap,
  image,
  table,
  Toolbar,
  useActionHandler,
  useFormattingState,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { textBlockWidth } from '@dxos/react-ui-theme';

import type { StackSectionContent } from '../components/Section';

export const EditorContent = ({ data: { content = '' } }: { data: StackSectionContent & { content?: string } }) => {
  const { themeMode } = useThemeContext();
  const [text] = useState(E.object(TextV0Type, { content }));
  const id = text.id;
  const doc = text.content;
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
        decorateMarkdown(),
        formattingKeymap(),
        image(),
        table(),
      ],
    };
  }, [id, formattingObserver, themeMode]);

  const handleAction = useActionHandler(view);

  return (
    <>
      <Toolbar.Root
        onAction={handleAction}
        state={formattingState}
        classNames='sticky block-start-0 bg-[--sticky-bg] z-10'
      >
        <Toolbar.Markdown />
        <Toolbar.Separator />
      </Toolbar.Root>
      <div ref={parentRef} className={textBlockWidth} />
    </>
  );
};
