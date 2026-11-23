//
// Copyright 2026 DXOS.org
//

import { Prec } from '@codemirror/state';
import React, { useCallback, useMemo, useRef } from 'react';

import { TextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import { createBasicExtensions, createThemeExtensions, keymap, typeahead } from '@dxos/ui-editor';

/**
 * A one-line editor that completes against the records themselves.
 *
 * The suggestions are the labels the current query returns, so the ghost text after the caret is
 * always something the dataset can answer; Tab accepts it. This is a text editor rather than an
 * input because the completion is a CodeMirror decoration — there is nowhere to draw it in an
 * `<input>` without a second, measured element behind the text.
 */
export const SearchBar = ({
  text,
  onTextChange,
  suggestions,
  classNames,
}: {
  text: string;
  onTextChange: (text: string) => void;
  /** Candidate completions, in the order they should be offered. */
  suggestions: readonly string[];
  classNames?: string;
}) => {
  const themeMode = Hooks.useThemeMode();

  // Held in a ref: the extensions must not change per keystroke, or the editor is recreated and
  // loses focus mid-word.
  const suggestionsRef = useRef(suggestions);
  suggestionsRef.current = suggestions;

  const handleComplete = useCallback(({ line }: { line: string }) => {
    if (line.length === 0) {
      return undefined;
    }
    const prefix = line.toLowerCase();
    const match = suggestionsRef.current.find(
      (suggestion) => suggestion.length > line.length && suggestion.toLowerCase().startsWith(prefix),
    );
    return match?.slice(line.length);
  }, []);

  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineWrapping: false, placeholder: 'Search…' }),
      createThemeExtensions({ themeMode, slots: { scroller: { className: 'scrollbar-none' } } }),
      typeahead({ onComplete: handleComplete }),
      // A search is one line: Enter neither breaks it nor reaches the document.
      Prec.highest(keymap.of([{ key: 'Enter', run: () => true }])),
    ],
    [themeMode, handleComplete],
  );

  return <TextEditor value={text} onChange={onTextChange} extensions={extensions} classNames={classNames} />;
};
