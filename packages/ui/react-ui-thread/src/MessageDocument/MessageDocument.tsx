//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { type ThemedClassName, useDynamicRef, useThemeContext, useTranslation } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
  extendedMarkdown,
  lineSpacing,
  scroller,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { ChunkModel, chunkSync } from '../model';
import { translationKey } from '../translations';
import { type MessageLike } from '../types';
import {
  type MessageDocumentOptions,
  messageDocumentChangedEffect,
  messageDocumentChrome,
  setMessageDocumentStateEffect,
} from './message-document-extension';
import {
  type MessageDocumentItemOptions,
  buildMessageDocumentItems,
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

  // Read through a ref so the editor is not rebuilt when a caller passes fresh callback identities
  // on every render, which is the common case and would otherwise remount on each keystroke.
  const handlersRef = useDynamicRef(handlers);
  const options = useMemo<MessageDocumentOptions>(
    () => ({
      model,
      themeMode,
      labels: {
        startThread: t('start-thread.label'),
        replyCount: (count: number) => t('reply-count.label', { count }),
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
    }),
    [model, themeMode, t, handlersRef],
  );

  const { parentRef, view } = useTextEditor(
    () => ({
      extensions: [
        createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
        createThemeExtensions({ themeMode, slots: documentSlots, syntaxHighlighting: true }),
        extendedMarkdown({}),
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
    model.set(buildMessageDocumentItems(messages, { groupWindowMs, dayDivider, gapDividerMs, dtLocale }));
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

  return <div className={mx('dx-container', classNames)} ref={parentRef} />;
};

MessageDocument.displayName = 'MessageDocument';
