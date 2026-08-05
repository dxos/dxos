//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type ThemedClassName, useDynamicRef, useThemeContext, useTranslation } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import {
  compactSlots,
  createBasicExtensions,
  createThemeExtensions,
  decorateMarkdown,
  lineSpacing,
  scroller,
} from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';

import { ChunkModel, chunkSync } from '../model';
import { translationKey } from '../translations';
import { type MessageLike } from '../types';
import {
  type MessageAction,
  type MessageDocumentOptions,
  type MessageHover,
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
      onDraftChange: (message, text) => {
        draftRef.current = { id: message.id, text };
      },
      onHoverChange: setHover,
    }),
    [model, t, handlersRef],
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

  const hoveredActions = hover
    ? (handlers.getActions?.({
        kind: 'message',
        id: hover.message.id,
        message: hover.message,
        head: true,
        last: false,
      }) ?? [])
    : [];

  return (
    // Relative, because the toolbar is positioned against the editor's own box: it overlays the
    // hovered row rather than taking a column beside it, so a long message keeps the full width.
    <div className='relative grid grid-rows-1 min-bs-0'>
      <div className={mx('dx-container', classNames)} ref={parentRef} />
      {hover && hoveredActions.length > 0 && (
        <MessageToolbar
          key={hover.message.id}
          top={hover.top}
          actions={hoveredActions}
          onAction={(action) => handlers.onAction?.(action, hover.message)}
        />
      )}
    </div>
  );
};

/** Icon and label per action, on the same translation keys the tile stack's controls use. */
const ACTIONS: Record<MessageAction, { icon: string; label: string }> = {
  react: { icon: 'ph--smiley--regular', label: 'add-reaction.label' },
  reply: { icon: 'ph--arrow-bend-up-left--regular', label: 'reply-message.label' },
  thread: { icon: 'ph--chats-circle--regular', label: 'start-thread.label' },
  edit: { icon: 'ph--pencil-simple--regular', label: 'edit-message.label' },
  delete: { icon: 'ph--trash--regular', label: 'delete-message.label' },
};

type MessageToolbarProps = {
  top: number;
  actions: MessageAction[];
  onAction: (action: MessageAction) => void;
};

/** Floating controls for the hovered message, on the same menu primitives as the tile stack. */
const MessageToolbar = ({ top, actions, onAction }: MessageToolbarProps) => {
  const { t } = useTranslation(translationKey);
  const onActionRef = useDynamicRef(onAction);
  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make().root({ label: ['message-controls.title', { ns: translationKey }] });
    for (const action of actions) {
      builder.action(
        action,
        {
          label: [ACTIONS[action].label, { ns: translationKey }],
          icon: ACTIONS[action].icon,
          iconOnly: true,
          testId: `thread.document.${action}`,
        },
        () => onActionRef.current(action),
      );
    }

    return builder.build();
  }, [actions, onActionRef, t]);

  return (
    // `alwaysActive`: the toolbar belongs to the hovered row, not to whichever plank holds
    // attention, so it must not disable itself when the transcript is unattended.
    <Menu.Root {...menuActions} alwaysActive iconSize={4}>
      <Menu.Toolbar
        classNames='absolute inline-end-2 w-auto rounded-sm border border-separator bg-baseSurface z-10'
        style={{ top }}
        density='sm'
      />
    </Menu.Root>
  );
};

MessageDocument.displayName = 'MessageDocument';
