//
// Copyright 2025 DXOS.org
//

import { useImperativeHandle } from '@preact-signals/safe-react/react';
import React, { forwardRef, useCallback } from 'react';

import { type Space } from '@dxos/client-protocol';
import { Type } from '@dxos/echo';
import { useThemeContext } from '@dxos/react-ui';
import {
  EditorView,
  type TypeaheadContext,
  autocomplete,
  createBasicExtensions,
  createThemeExtensions,
  matchCompletion,
  staticCompletion,
  typeahead,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

export interface QueryBoxController {
  getText: () => string;
}

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

/**
 * @deprecated
 */
export const QueryBox = forwardRef<QueryBoxController, QueryBoxProps>(
  (
    { space, classNames, autoFocus, lineWrapping, placeholder, initialValue, onChange, onSubmit, onSuggest, onCancel },
    forwardedRef,
  ) => {
    const { themeMode } = useThemeContext();

    const handleComplete = useCallback(
      ({ line }: TypeaheadContext) => {
        const words = line.split(/\s+/).filter(Boolean);
        if (words.length > 0) {
          const word = words.at(-1);
          const match = word?.match(/^type:(.+)/);
          if (match) {
            const part = match[1];
            for (const schema of space?.db.graph.schemaRegistry.schemas ?? []) {
              const typename = Type.getTypename(schema);
              if (typename) {
                const completion = matchCompletion(typename, part);
                if (completion) {
                  return completion;
                }
              }
            }
          }

          return staticCompletion(['type:', 'AND', 'OR', 'NOT'])({ line });
        }
      },
      [space],
    );

    const { parentRef, view } = useTextEditor(
      () => ({
        initialValue,
        autoFocus,
        extensions: [
          createBasicExtensions({ lineWrapping, placeholder }),
          createThemeExtensions({ themeMode }),
          autocomplete({ onSubmit, onSuggest, onCancel }),
          typeahead({ onComplete: handleComplete }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChange?.(update.state.doc.toString());
            }
          }),
        ].filter(isNonNullable),
      }),
      [themeMode, handleComplete, onSubmit, onSuggest, onCancel],
    );

    useImperativeHandle(
      forwardedRef,
      () => ({
        getText: () => view?.state.doc.toString() ?? '',
      }),
      [view],
    );

    return <div ref={parentRef} className={mx('is-full', classNames)} />;
  },
);
