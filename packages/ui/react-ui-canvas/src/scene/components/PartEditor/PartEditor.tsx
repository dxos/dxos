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

import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { type PartEditing, type PartKey, isMultiline } from '../../utils/parts.ts';

export type TextPartProps = ThemedClassName<
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

type PartEditorProps = ThemedClassName<{ part: PartKey; text: string; editing: PartEditing }>;

const stop = (event: React.SyntheticEvent) => event.stopPropagation();

const PartEditor = ({ classNames, part, text, editing }: PartEditorProps) => {
  const { themeMode } = useThemeContext();
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
          slots: { editor: { className: 'h-full w-full [&>.cm-scroller]:scrollbar-none' } },
        }),
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
