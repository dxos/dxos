//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  createMarkdownExtensions,
  createBasicExtensions,
  createDataExtensions,
  useTextEditor,
  createThemeExtensions,
  outliner,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

export type OutlinerProps = ThemedClassName<{
  text: DataType.Text;
}>;

export const Outliner = ({ classNames, text }: OutlinerProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      id: text.id,
      initialValue: text.content, // TODO(burdon): Make this optional.
      extensions: [
        createDataExtensions({ id: text.id, text: createDocAccessor(text, ['content']) }),
        createBasicExtensions({ readOnly: false }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        outliner(),
      ],
    }),
    [text, themeMode],
  );

  return <div ref={parentRef} {...focusAttributes} className={mx('flex w-full justify-center', classNames)} />;
};
