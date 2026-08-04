//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { type ThemedClassName, useThemeContext, useTranslation } from '@dxos/react-ui';
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
import { type MessageLike, type MessageMetadata, type MessageReaction } from '../types';
import {
  type TranscriptAction,
  type TranscriptExtensionOptions,
  transcriptChangedEffect,
  transcriptChrome,
} from './transcript-extension';
import {
  type MessageItem,
  type TranscriptItemOptions,
  buildTranscriptItems,
  renderTranscriptItem,
} from './transcript-items';

export type TranscriptProps = ThemedClassName<
  {
    messages: readonly MessageLike[];
    getMetadata: (message: MessageLike) => MessageMetadata;
    getReactions?: (message: MessageLike) => MessageReaction[];
    getActions?: (item: MessageItem) => TranscriptAction[];
    onAction?: (action: TranscriptAction, message: MessageLike) => void;
    onReact?: (message: MessageLike, emoji: string) => void;
  } & TranscriptItemOptions
>;

/**
 * CodeMirror-rendered message transcript.
 *
 * The document holds message bodies as plain markdown and nothing else; author, time, avatar,
 * reactions and dividers are decorations the chrome extension derives from the model's chunk
 * ranges. Same substrate as the assistant chat and the transcription view, so the three can share
 * widgets and streaming rather than only resembling each other.
 */
export const Transcript = ({
  classNames,
  messages,
  getMetadata,
  getReactions,
  getActions,
  onAction,
  onReact,
  groupWindowMs,
  dayDivider,
  gapDividerMs,
}: TranscriptProps) => {
  const { themeMode } = useThemeContext();
  const { dtLocale } = useTranslation(translationKey);
  const model = useMemo(() => new ChunkModel(renderTranscriptItem), []);

  // Options the chrome reads on every rebuild; the object is stable so the editor is not rebuilt
  // when a callback identity changes between renders.
  const options = useMemo<TranscriptExtensionOptions>(
    () => ({ model, getMetadata, getReactions, getActions, onAction, onReact }),
    [model, getMetadata, getReactions, getActions, onAction, onReact],
  );

  const { parentRef, view } = useTextEditor(
    () => ({
      extensions: [
        createBasicExtensions({ readOnly: true, lineWrapping: true, search: true }),
        createThemeExtensions({ themeMode, slots: documentSlots, syntaxHighlighting: true }),
        extendedMarkdown({}),
        decorateMarkdown(),
        lineSpacing(),
        transcriptChrome(options),
        chunkSync({ model }),
        scroller({ overScroll: 80, autoScroll: true }),
      ],
    }),
    [themeMode, options, model],
  );

  useEffect(() => {
    model.set(buildTranscriptItems(messages, { groupWindowMs, dayDivider, gapDividerMs, dtLocale }));
    // Decorations are derived from the model, not from the document, so a change that leaves the
    // text alone — a new reaction, a regrouped run — still has to prompt a rebuild.
    view?.dispatch({ effects: transcriptChangedEffect.of(null) });
  }, [model, view, messages, groupWindowMs, dayDivider, gapDividerMs, dtLocale]);

  return <div className={mx('dx-container', classNames)} ref={parentRef} />;
};

Transcript.displayName = 'Transcript';
