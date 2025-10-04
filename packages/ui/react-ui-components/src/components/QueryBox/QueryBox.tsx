//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/client-protocol';
import { useThemeContext } from '@dxos/react-ui';
import {
  EditorView,
  autocomplete,
  createBasicExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { useMatcherExtension } from '../../hooks';

export type QueryBoxProps = {
  space?: Space;
  classNames?: string;
  autoFocus?: boolean;
  lineWrapping?: boolean;
  placeholder?: string;
  initialValue?: string;
  onChange?: (text: string) => void;
  onSubmit?: (text: string) => boolean | void;
  onSuggest?: (text: string) => string[];
  onCancel?: () => void;
};

export const QueryBox = ({
  space,
  classNames,
  autoFocus,
  lineWrapping,
  placeholder,
  initialValue,
  onChange,
  onSubmit,
  onSuggest,
  onCancel,
}: QueryBoxProps) => {
  const { themeMode } = useThemeContext();
  const extensions = useMatcherExtension(space);

  const { parentRef } = useTextEditor(
    () => ({
      initialValue,
      autoFocus,
      extensions: [
        createThemeExtensions({ themeMode }),
        createBasicExtensions({
          bracketMatching: false,
          lineWrapping,
          placeholder,
        }),
        autocomplete({ onSubmit, onSuggest, onCancel }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange?.(update.state.doc.toString());
          }
        }),
        extensions,
      ].filter(isNonNullable),
    }),
    [themeMode, extensions, onSubmit, onSuggest, onCancel],
  );

  return <div ref={parentRef} className={mx('is-full', classNames)} />;
};
