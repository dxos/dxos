//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  type BasicExtensionsOptions,
  createBasicExtensions,
  createThemeExtensions,
  useTextEditor,
  type UseTextEditorProps,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

import { createAutocompleteExtension, type AutocompleteOptions } from './prompt-autocomplete';

export type PromptProps = ThemedClassName<
  AutocompleteOptions & Pick<UseTextEditorProps, 'autoFocus'> & Pick<BasicExtensionsOptions, 'lineWrapping'>
>;

export const Prompt = ({ classNames, autoFocus, lineWrapping = false, onEnter, onSuggest }: PromptProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor({
    autoFocus,
    extensions: [
      createBasicExtensions({
        bracketMatching: false,
        lineWrapping,
        placeholder: 'Ask a question...',
      }),
      createThemeExtensions({ themeMode }),
      createAutocompleteExtension({ onEnter, onSuggest }),
    ],
  });

  return <div ref={parentRef} className={mx(classNames)} />;
};
