//
// Copyright 2026 DXOS.org
//

import { Compartment } from '@codemirror/state';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { type ThemedClassName, useDynamicRef, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { type ContentBlock } from '@dxos/types';
import {
  type Extension,
  compactSlots,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  keymap,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { command } from '../command';
import { ChunkModel, chunkSync } from '../model';
import { buildMessageChunks, getMessageChunkText, renderMessageChunk } from './message-chunks';
import { editable, readOnly } from './message-renderer-extension';

export type MessageRendererProps = ThemedClassName<{
  /** The message's blocks, in order; only the textual ones reach the document. */
  blocks: readonly ContentBlock.Any[];
  /** Editable in place. The caller decides who may edit; this only renders the mode. */
  editing?: boolean;
  /** Extensions this message needs beyond the shared set — a consumer's own widgets. */
  extensions?: Extension;
  /** Every keystroke, so the caller can hold the draft without re-rendering the editor. */
  onChange?: (text: string) => void;
  /** Enter, in edit mode. */
  onCommit?: () => void;
  /** Escape, in edit mode. */
  onCancel?: () => void;
}>;

/**
 * One message's body, rendered by CodeMirror — a transcript row, not a composer.
 *
 * Read-only in the ordinary case: a message in a thread is something you read, and only its own
 * author editing in place makes it briefly writable. The thing you type a NEW message into is
 * `ChatEditor`, behind `Message.Textbox`.
 *
 * The editor is built once and written to by a {@link ChunkModel}, rather than rebuilt whenever the
 * text changes: a message's blocks grow at the tail while it streams, and the model reports that
 * growth as an append, which is what a typewriter can animate and what keeps the caret and the
 * scroll position where the reader left them. Rebuilding the view per revision — as this stack did
 * before — throws all three away on every token.
 *
 * Chrome around the body (heading, avatar, reactions, quote, thread row, controls) is the tile's,
 * in React. This renders the body and nothing else, which is what makes it shareable between the
 * channel, the assistant chat and the transcription view.
 */
export const MessageRenderer = ({
  classNames,
  blocks,
  editing,
  extensions,
  onChange,
  onCommit,
  onCancel,
}: MessageRendererProps) => {
  const { themeMode } = useThemeContext();
  const model = useMemo(() => new ChunkModel(renderMessageChunk), []);
  // Per view, since a compartment addresses one configuration: two messages sharing one would
  // reconfigure each other.
  const editableCompartment = useMemo(() => new Compartment(), []);

  // The draft is a ref, not state: the document already holds what was typed, so a re-render per
  // keystroke would buy nothing and would race the caret.
  const draftRef = useRef<string | undefined>(undefined);

  // Read through refs so the editor is not rebuilt when a caller passes fresh callback identities,
  // which is the common case — and a rebuilt editor is a new view competing for the same model.
  const onCommitRef = useDynamicRef(onCommit);
  const onCancelRef = useDynamicRef(onCancel);
  const onChangeRef = useDynamicRef(onChange);
  // The keymap is captured when the view is built, and the view is deliberately built once — so the
  // mode has to be read at keystroke time rather than closed over, or Enter answers for whatever
  // mode the message was in when it first rendered.
  const editingRef = useDynamicRef(editing);

  const handleChange = useCallback(
    (text: string) => {
      draftRef.current = text;
      onChangeRef.current?.(text);
    },
    [onChangeRef],
  );

  const { parentRef, focusAttributes, view } = useTextEditor(
    () => ({
      extensions: [
        // Ahead of `createBasicExtensions`, which provides `EditorView.editable` itself: the facet
        // takes the first value it is given, so a compartment placed after it never wins.
        editableCompartment.of(readOnly),
        // Enter commits and Shift+Enter breaks the line, the same contract as composing a message:
        // an edit is submitted, not toggled off. `keymap` here rather than in the shared set because
        // only an editable body binds them.
        keymap.of([
          {
            key: 'Enter',
            run: () => {
              if (!editingRef.current) {
                return false;
              }

              onCommitRef.current?.();
              return true;
            },
          },
          {
            key: 'Escape',
            run: () => {
              if (!editingRef.current) {
                return false;
              }

              draftRef.current = undefined;
              onCancelRef.current?.();
              return true;
            },
          },
        ]),
        // Deliberately NOT `readOnly`: its transaction filter drops every user edit, so a view built
        // read-only cannot become writable. Editability is a compartment the mode toggles instead.
        createBasicExtensions({ lineWrapping: true }),
        // `compactSlots`, not `documentSlots`: the latter centres content in a 50rem column, which
        // is a document's layout and not a chat row's.
        createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: compactSlots }),
        // The parser, not only the decorator: `decorateMarkdown` reads a syntax tree, so without the
        // markdown language nothing is decorated and a body renders as its own source — asterisks,
        // backticks and link brackets and all.
        createMarkdownExtensions(),
        decorateMarkdown(),
        command,
        chunkSync({ model, autoScroll: false }),
        extensions,
      ].filter(isTruthy),
    }),
    [themeMode, model, editableCompartment, extensions],
  );

  // Editability is dispatched, not rebuilt: entering edit mode must keep the same view, or the text
  // the user is about to change is thrown away and rebuilt underneath them.
  useEffect(() => {
    view?.dispatch({
      effects: editableCompartment.reconfigure(editing ? editable({ model, onChange: handleChange }) : readOnly),
    });
    if (editing) {
      view?.focus();
    }
  }, [view, editing, handleChange, editableCompartment, model]);

  useEffect(() => {
    // While editing, the edited text is the draft rather than the stored blocks, so a revision
    // arriving from a peer cannot overwrite what is being typed.
    if (!editing) {
      draftRef.current = undefined;
    }

    model.set(
      buildMessageChunks(blocks, {
        draft: editing ? (draftRef.current ?? getMessageChunkText(blocks)) : undefined,
      }),
    );
  }, [model, blocks, editing]);

  return <div ref={parentRef} className={mx(classNames)} {...focusAttributes} />;
};
