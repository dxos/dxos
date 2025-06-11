//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { useThemeContext } from '@dxos/react-ui';
import {
  createMarkdownExtensions,
  createBasicExtensions,
  createDataExtensions,
  useTextEditor,
  createThemeExtensions,
  outliner,
  editorSlots,
} from '@dxos/react-ui-editor';
import { type DataType } from '@dxos/schema';

export type OutlinerProps = {
  text: DataType.Text;
};

export const Outliner = ({ text }: OutlinerProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      id: text.id,
      initialValue: text.content, // TODO(burdon): Make this optional.
      extensions: [
        createDataExtensions({ id: text.id, text: createDocAccessor(text, ['content']) }),
        createBasicExtensions({ readOnly: false }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, slots: editorSlots }),
        outliner(),
      ],
    }),
    [text, themeMode],
  );

  return <div ref={parentRef} {...focusAttributes} className='flex w-full justify-center' />;
};
