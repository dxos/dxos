//
// Copyright 2026 DXOS.org
//

//
// A node's text part: static text, or, while it is the part being edited, an in-place editor over the
// same box. Enter commits (Mod-Enter in a multi-line part, where Enter breaks the line), Escape rejects,
// and leaving the editor commits. Pointer and key events stay inside so the canvas neither drags nor
// handles shortcuts while the user types.
//

import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import React, { type PropsWithChildren, useRef } from 'react';

import { useTextEditor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import type * as Util from '@dxos/react-ui/Util';
import { createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { type PartEditing, type PartKey, isMultiline } from '../../utils/parts.ts';

export type TextPartProps = Util.ThemedClassName<
  PropsWithChildren<{
    part: PartKey;
    /** The part's current text, which the editor starts from. */
    text: string;
    editing?: PartEditing;
  }>
>;

/** Renders `children` as the part's text, or the editor when `editing` names this part. */
export const TextPart = ({ classNames, part, text, editing, children }: TextPartProps) =>
  editing?.part === part ? (
    <PartEditor classNames={classNames} part={part} text={text} editing={editing} />
  ) : (
    <div className={mx(classNames)} data-part={part}>
      {children}
    </div>
  );

type PartEditorProps = Util.ThemedClassName<{ part: PartKey; text: string; editing: PartEditing }>;

const stop = (event: React.SyntheticEvent) => event.stopPropagation();

const PartEditor = ({ classNames, part, text, editing }: PartEditorProps) => {
  const themeMode = Hooks.useThemeMode();
  const multiline = isMultiline(part);
  // Commit or cancel once: the editor unmounts on either, and its focus loss must not commit again.
  const done = useRef(false);
  const finish = (action: () => void) => {
    if (!done.current) {
      done.current = true;
      action();
    }
  };
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      id: `part-${part}`,
      initialValue: text,
      autoFocus: true,
      selectionEnd: true,
      extensions: [
        createBasicExtensions({ lineWrapping: true, history: false, search: false }),
        createThemeExtensions({
          themeMode,
          // Content height, not full height, so the part's own layout places the editor where it puts the
          // static text (a label centred in its cell).
          slots: { editor: { className: 'w-full max-h-full [&>.cm-scroller]:scrollbar-none' } },
        }),
        // The part's own leading, not the editor theme's, so the lines do not shift when editing starts.
        Prec.highest(EditorView.theme({ '.cm-scroller, .cm-content, .cm-line': { lineHeight: 'inherit' } })),
        EditorView.focusChangeEffect.of((state, focusing) => {
          if (!focusing) {
            finish(() => editing.commit(state.doc.toString()));
          }
          return null;
        }),
        Prec.highest(
          keymap.of([
            {
              key: 'Enter',
              run: (view) => {
                if (multiline) {
                  view.dispatch(view.state.replaceSelection('\n'));
                } else {
                  finish(() => editing.commit(view.state.doc.toString()));
                }
                return true;
              },
            },
            {
              key: 'Mod-Enter',
              run: (view) => {
                finish(() => editing.commit(view.state.doc.toString()));
                return true;
              },
            },
            {
              key: 'Escape',
              run: () => {
                finish(() => editing.cancel());
                return true;
              },
            },
          ]),
        ),
      ],
    }),
    [part, text, multiline, themeMode, editing],
  );

  return (
    <div
      ref={parentRef}
      {...focusAttributes}
      className={mx('select-text cursor-text', classNames)}
      data-part={part}
      data-testid='part-editor'
      onPointerDown={stop}
      onDoubleClick={stop}
      onKeyDown={stop}
    />
  );
};
