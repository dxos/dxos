//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { type BuildResult, QueryBuilder } from '@dxos/echo-query';
import { type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  Editor,
  type EditorController,
  type EditorMenuProviderProps,
  type EditorViewProps,
  type UseEditorMenuProps,
  createMenuGroup,
} from '@dxos/react-ui-editor';
import { createBasicExtensions, createThemeExtensions, keymap } from '@dxos/ui-editor';

import { translationKey } from '#translations';

import { type CompletionOptions, completions } from './autocomplete';
import { query, queryDoc, queryText } from './query-extension';

export type QueryEditorProps = ThemedClassName<
  {
    value?: string;
    readonly?: boolean;
    /**
     * The parsed query, rebuilt on every edit. `filter` is undefined while the text does not parse,
     * which is what a caller gates a "save this view" affordance on.
     *
     * Supplying this is what opts the editor into building a filter at all — the DSL is otherwise
     * parsed only for decoration, and a caller that wants the raw text pays nothing for a parse it
     * will not read.
     */
    onFilterChange?: (result: BuildResult) => void;
  } & (CompletionOptions & Omit<EditorViewProps, 'initialValue'> & Pick<EditorMenuProviderProps, 'numItems'>)
>;

/**
 * Query editor with decorations and autocomplete.
 */
export const QueryEditor = forwardRef<EditorController, QueryEditorProps>(
  ({ db, tags, value, readonly, numItems = 8, onChange, onFilterChange, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);

    const getOptions = useMemo(() => completions({ db, tags }), [db, tags]);
    const getMenu = useCallback<NonNullable<UseEditorMenuProps['getMenu']>>(
      async (context) => [createMenuGroup({ items: getOptions(context) })],
      [getOptions],
    );

    // The editor owns the parse that used to be repeated by every consumer: the DSL was already being
    // parsed here for decorations, so a caller building its own `QueryBuilder` parsed each keystroke
    // twice.
    const builder = useMemo(() => (onFilterChange ? new QueryBuilder(tags) : undefined), [onFilterChange, tags]);
    const handleChange = useCallback(
      (doc: string) => {
        // The editor keeps a trailing space so every tag is terminated and renders as a chip; that is
        // an internal affordance, so callers never see it.
        const text = queryText(doc);
        onChange?.(text);
        if (builder) {
          onFilterChange?.(builder.build(text));
        }
      },
      [onChange, onFilterChange, builder],
    );

    const { themeMode } = useThemeContext();
    const extensions = useMemo<Extension[]>(
      () => [
        createBasicExtensions({
          readOnly: readonly,
          lineWrapping: false,
          placeholder: t('query-editor.placeholder'),
          // A single-line query gains nothing from bracket matching, and CodeMirror's default paints
          // `.cm-matchingBracket` with a background while focused — a coloured wash over the braces of
          // an object literal the moment the caret reaches it.
          bracketMatching: false,
        }),
        createThemeExtensions({ themeMode, slots: { scroller: { className: 'scrollbar-none' } } }),
        query({ tags }),
        Prec.highest(
          keymap.of([
            {
              key: 'Enter',
              run: () => {
                // Prevent newline.
                return true;
              },
            },
          ]),
        ),
      ],
      [readonly, themeMode, tags, t],
    );

    return (
      <Editor.Root
        ref={forwardedRef}
        extensions={extensions}
        numItems={numItems}
        // `#` opens the tag list. `:` cannot be a trigger — `popoverKeymap` only fires one at a line
        // start or after a space, and a typename's colon follows `type`; `activateOnTyping` covers it
        // instead, since `:` is a completion delimiter so the word under the caret is the typename.
        // The explicit key stays, for re-opening a dismissed menu.
        trigger={['#']}
        activateOnTyping
        triggerKey='Ctrl-Space'
        getMenu={getMenu}
      >
        <Editor.View {...props} initialValue={queryDoc(value)} onChange={handleChange} selectionEnd />
      </Editor.Root>
    );
  },
);
