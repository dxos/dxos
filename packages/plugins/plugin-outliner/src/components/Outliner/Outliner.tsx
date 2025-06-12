//
// Copyright 2025 DXOS.org
//

import { EditorSelection } from '@codemirror/state';
import React from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  createMarkdownExtensions,
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
  outliner,
  useTextEditor,
  type UseTextEditorProps,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

export type OutlinerProps = ThemedClassName<
  {
    id: string;
    text: DataType.Text;
  } & Pick<UseTextEditorProps, 'id' | 'autoFocus'>
>;

export const Outliner = ({ classNames, text, id, autoFocus }: OutlinerProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      id,
      autoFocus,
      // TODO(burdon): Make this optional.
      initialValue: text.content,
      // Auto select end of document.
      selection: EditorSelection.cursor(text.content.length),
      extensions: [
        createDataExtensions({ id, text: createDocAccessor(text, ['content']) }),
        createBasicExtensions({ readOnly: false }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        outliner(),
      ],
    }),
    [id, text, autoFocus, themeMode],
  );

  return <div ref={parentRef} {...focusAttributes} className={mx('flex w-full justify-center', classNames)} />;
};
