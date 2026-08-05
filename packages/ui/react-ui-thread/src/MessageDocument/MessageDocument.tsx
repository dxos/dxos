//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type ThemedClassName, useDynamicRef, useThemeContext, useTranslation } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { type Message as MessageType } from '@dxos/types';
import {
  compactSlots,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  lineSpacing,
  scroller,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { Message, makeMessageState } from '../Message';
import { ChunkModel, chunkSync } from '../model';
import { translationKey } from '../translations';
import { type MessageLike } from '../types';
import {
  type MessageDocumentOptions,
  type MessageHover,
  type MessagePortal,
  messageDocumentChangedEffect,
  messageDocumentChrome,
  setMessageDocumentStateEffect,
} from './message-document-extension';
import {
  type MessageDocumentItemOptions,
  buildMessageDocumentItems,
  getMessageText,
  renderMessageDocumentItem,
} from './message-document-items';

export type MessageDocumentProps = ThemedClassName<
  {
    messages: readonly MessageLike[];
    /** Message being edited; its body is swapped for an editor over the same text. */
    editingId?: string;
    /** Message the host is currently referring to; marked `aria-current` and tinted. */
    currentId?: string;
  } & Omit<MessageDocumentOptions, 'model' | 'themeMode' | 'labels'> &
    MessageDocumentItemOptions
>;

/**
 * CodeMirror-rendered message transcript.
 *
 * The document holds message bodies as plain markdown and nothing else; author, time, avatar,
 * reactions and dividers are decorations the chrome extension derives from the model's chunk
 * ranges. Same substrate as the assistant chat and the transcription view, so the three can share
 * widgets and streaming rather than only resembling each other.
 */
export const MessageDocument = ({
  classNames,
  messages,
  editingId,
  currentId,
  groupWindowMs,
  dayDivider,
  gapDividerMs,
  ...handlers
}: MessageDocumentProps) => {
  const { themeMode } = useThemeContext();
  const { t, dtLocale } = useTranslation(translationKey);
  const model = useMemo(() => new ChunkModel(renderMessageDocumentItem), []);

  // The draft is a ref, not state: the document already holds the text the user typed, so a
  // re-render per keystroke would buy nothing and would race the caret. Reads happen when the
  // items are rebuilt, which is driven by everything except typing.
  const draftRef = useRef<{ id: string; text: string }>(undefined);

  // Which row the pointer is over, and where its toolbar goes. Reported by the chrome, rendered
  // here so the controls are ordinary `react-ui-menu` actions rather than hand-built DOM.
  const [hover, setHover] = useState<MessageHover | undefined>(undefined);
  // Widget contents the chrome asks the host to render: the row frame has to be the tile stack's
  // own `Avatar` and heading, not a DOM lookalike of them.
  const [portals, setPortals] = useState<MessagePortal[]>([]);
  const handlePortalMount = useCallback(
    (portal: MessagePortal) => setPortals((current) => [...current.filter((p) => p.id !== portal.id), portal]),
    [],
  );
  const handlePortalUnmount = useCallback(
    (id: string) => setPortals((current) => current.filter((portal) => portal.id !== id)),
    [],
  );

  // Read through a ref so the editor is not rebuilt when a caller passes fresh callback identities
  // on every render, which is the common case and would otherwise remount on each keystroke.
  const handlersRef = useDynamicRef(handlers);
  // `t` gains a new identity as translations load; depending on it here rebuilt the editor, and a
  // rebuilt editor is a new view competing for the same model.
  const tRef = useDynamicRef(t);
  const options = useMemo<MessageDocumentOptions>(
    () => ({
      model,
      themeMode,
      labels: {
        startThread: () => tRef.current('start-thread.label'),
        replyCount: (count: number) => tRef.current('reply-count.label', { count }),
      },
      getMetadata: (message) => handlersRef.current.getMetadata(message),
      getReactions: (message) => handlersRef.current.getReactions?.(message) ?? [],
      getQuote: (message) => handlersRef.current.getQuote?.(message),
      getThreadSummary: (message) => handlersRef.current.getThreadSummary?.(message),
      getActions: (item) => handlersRef.current.getActions?.(item) ?? [],
      onAction: (action, message) => handlersRef.current.onAction?.(action, message),
      onReact: (message, emoji) => handlersRef.current.onReact?.(message, emoji),
      onThreadOpen: (message) => handlersRef.current.onThreadOpen?.(message),
      onSelect: (message) => handlersRef.current.onSelect?.(message),
      onEditCommit: (message, text) => handlersRef.current.onEditCommit?.(message, text),
      onEditCancel: (message) => handlersRef.current.onEditCancel?.(message),
      onDraftChange: (message, text) => {
        draftRef.current = { id: message.id, text };
      },
      onHoverChange: setHover,
      onPortalMount: handlePortalMount,
      onPortalUnmount: handlePortalUnmount,
    }),
    [model, handlersRef, tRef, handlePortalMount, handlePortalUnmount],
  );

  const { parentRef, view } = useTextEditor(
    () => ({
      extensions: [
        // Deliberately not `readOnly`: that drops every user edit through its own transaction
        // filter, which would defeat the one writable row. Editability is governed by the chrome,
        // which turns it on only for the message being edited.
        createBasicExtensions({ lineWrapping: true, search: true }),
        // No syntax highlighting: a message body is prose, not source, and highlighting it wraps
        // every paragraph in a themed span. `extendedMarkdown` is likewise for XML tag widgets,
        // which this document does not use — its chrome comes from the model's ranges.
        // `compactSlots`, not `documentSlots`: the latter centres the content in a 50rem column,
        // which strands the avatar gutter against the far-left edge of the scroller instead of
        // beside the message it belongs to. A channel wants the transcript's full width anyway.
        createThemeExtensions({ themeMode, slots: compactSlots }),
        decorateMarkdown(),
        lineSpacing(),
        messageDocumentChrome(options),
        chunkSync({ model }),
        scroller({ overScroll: 80, autoScroll: true }),
      ],
    }),
    [themeMode, options, model],
  );

  const { getReactions, getQuote, getThreadSummary, getActions } = handlers;
  useEffect(() => {
    // Entering edit mode seeds the draft from the stored body, so the first render of the editable
    // row is the text the user expects to be editing; leaving it throws the draft away.
    if (!editingId) {
      draftRef.current = undefined;
    } else if (draftRef.current?.id !== editingId) {
      const message = messages.find((message) => message.id === editingId);
      draftRef.current = message ? { id: editingId, text: getMessageText(message) } : undefined;
    }

    model.set(
      buildMessageDocumentItems(messages, {
        groupWindowMs,
        dayDivider,
        gapDividerMs,
        dtLocale,
        draft: draftRef.current,
      }),
    );
    // Decorations are derived from the model, not from the document, so a change that leaves the
    // text alone — a new reaction, a regrouped run, a message entering edit mode — still has to
    // prompt a rebuild. The getters are in the dependencies for the same reason: they read host
    // state the editor cannot see, so their identity is the only signal that it moved.
    view?.dispatch({
      effects: [setMessageDocumentStateEffect.of({ editingId, currentId }), messageDocumentChangedEffect.of(null)],
    });
  }, [
    model,
    view,
    messages,
    editingId,
    currentId,
    groupWindowMs,
    dayDivider,
    gapDividerMs,
    dtLocale,
    getReactions,
    getQuote,
    getThreadSummary,
    getActions,
  ]);

  return (
    // The toolbar lives here rather than inside the editor, so leaving the editor must not dismiss
    // it — the pointer has to be able to travel onto it. Hover is cleared when it leaves both.
    <div className='relative grid grid-rows-1 min-h-0' onMouseLeave={() => setHover(undefined)}>
      <div className={mx('dx-container', classNames)} ref={parentRef} />
      {portals.map((portal) =>
        createPortal(
          <MessageHead message={portal.message} continues={portal.continues} getMetadata={handlers.getMetadata} />,
          portal.root,
          portal.id,
        ),
      )}
      {hover && <HoverControls message={hover.message} top={hover.top} />}
    </div>
  );
};

/**
 * The tile stack's own controls, floated over the hovered row — quick reactions inline, the rest
 * behind the overflow menu. Reusing the component is the point: a second implementation would
 * drift from it, and these actions already live in the action graph.
 */
const HoverControls = ({ message, top }: { message: MessageLike; top: number }) => {
  // One state atom per hovered row, so edit mode and the picker reset when the pointer moves on.
  const state = useMemo(makeMessageState, [message.id]);
  return (
    <div className='absolute z-1 end-1' style={{ top }}>
      <Message.Controls message={message as MessageType.Message} state={state} />
    </div>
  );
};

type MessageHeadProps = {
  message: MessageLike;
  continues: boolean;
  getMetadata: MessageDocumentOptions['getMetadata'];
};

/**
 * Avatar and heading for the first message of a run, in the tile stack's own two-column rail
 * layout — same `Avatar` component, same `--dx-rail-size` column, so the two renderings line up.
 */
const MessageHead = ({ message, continues, getMetadata }: MessageHeadProps) => {
  const metadata = getMetadata(message);
  return (
    <Message.Root {...metadata} continues={continues}>
      <Message.Heading authorName={metadata.authorName} timestamp={metadata.timestamp} />
    </Message.Root>
  );
};
