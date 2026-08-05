//
// Copyright 2026 DXOS.org
//

import { useAtomSet, useAtomValue } from '@effect-atom/atom-react';
import React, { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { DensityProvider, type ThemedClassName, useDynamicRef, useThemeContext, useTranslation } from '@dxos/react-ui';
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
  commitMessageEditEffect,
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
  const frameRef = useRef<HTMLDivElement>(null);
  // Opening the overflow menu moves the pointer into a portaled popover, which reads as leaving the
  // transcript — dismissing the toolbar the menu belongs to. While something in it is expanded the
  // toolbar stays; the next row hovered replaces it, as it does in Discord.
  const handleMouseLeave = useCallback(() => {
    if (!frameRef.current?.querySelector('[aria-expanded="true"]')) {
      setHover(undefined);
    }
  }, []);
  // Widget contents the chrome asks the host to render: the row frame has to be the tile stack's
  // own `Avatar` and heading, not a DOM lookalike of them.
  const [portals, setPortals] = useState<MessagePortal[]>([]);
  const handlePortalMount = useCallback(
    (portal: MessagePortal) => setPortals((current) => [...current.filter((p) => p.id !== portal.id), portal]),
    [],
  );
  const handlePortalUnmount = useCallback(
    (id: string, root: HTMLElement) =>
      // Only when this is still the mounted root: a rebuilt decoration destroys the old widget
      // after the new one has registered, and both carry the same id.
      setPortals((current) => current.filter((portal) => !(portal.id === id && portal.root === root))),
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
        editing: () => tRef.current('editing.message'),
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

  // A message's chrome lives in block widgets of its own, which the line decoration that tints the
  // body cannot reach — so the highlight is toggled on the portal roots. Done on the element rather
  // than through the rendered tree, which leaves the widgets and their React content untouched.
  useEffect(() => {
    for (const portal of portals) {
      // Every piece of the message, not just its header: the quote it answers, its reactions and
      // its thread row are all part of the row being hovered, so the highlight has to span them.
      portal.root.classList.toggle('bg-hover-surface', portal.message.id === hover?.message.id);
    }
  }, [portals, hover]);

  // A run's head carries the avatar and heading in a block above its first line, and the toolbar
  // belongs to the whole row — so it anchors to the head's top, not to the body line's. Measured
  // from the DOM because only it knows how tall the heading laid out, and re-measured as the
  // transcript scrolls: the anchor moves with the document, and the editor scrolls without
  // re-rendering this component, so a position read once at hover time comes adrift of its message.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const headRoot = hover && portals.find((portal) => portal.kind === 'head' && portal.message.id === hover.message.id);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!hover || !frame) {
      return;
    }

    const { scrollDOM } = view ?? {};
    // A continuation has no head of its own, so its own first line is the anchor.
    const anchor =
      headRoot?.root ??
      scrollDOM?.querySelector<HTMLElement>(`.cm-line[data-message-id="${CSS.escape(hover.message.id)}"]`);
    const position = () => {
      const toolbar = toolbarRef.current;
      if (!toolbar || !anchor) {
        return;
      }

      const { top } = anchor.getBoundingClientRect();
      toolbar.style.top = `${top - frame.getBoundingClientRect().top}px`;
      // Scrolled past its message, the toolbar would sit over an unrelated one; it belongs to the
      // row, so it leaves with it.
      const bounds = scrollDOM?.getBoundingClientRect();
      toolbar.style.visibility = bounds && (top < bounds.top || top > bounds.bottom) ? 'hidden' : 'visible';
    };

    position();
    scrollDOM?.addEventListener('scroll', position, { passive: true });
    return () => scrollDOM?.removeEventListener('scroll', position);
  }, [hover, headRoot, view]);

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
      effects: [
        setMessageDocumentStateEffect.of({ editingId, currentId, hoveredId: hover?.message.id }),
        messageDocumentChangedEffect.of(null),
      ],
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
    hover,
  ]);

  return (
    // The toolbar lives here rather than inside the editor, so leaving the editor must not dismiss
    // it — the pointer has to be able to travel onto it. Hover is cleared when it leaves both.
    <div className='relative grid grid-rows-1 min-h-0' ref={frameRef} onMouseLeave={handleMouseLeave}>
      <div className={mx('dx-container', classNames)} ref={parentRef} />
      {portals.map((portal) =>
        createPortal(<MessageChrome portal={portal} handlers={handlers} />, portal.root, portal.id),
      )}
      {hover && (
        // Keyed, so moving to another row builds fresh controls rather than carrying the previous
        // row's edit state onto it.
        <HoverControls
          key={hover.message.id}
          ref={toolbarRef}
          message={hover.message}
          editing={editingId === hover.message.id}
          onEdit={() => handlers.onAction?.('edit', hover.message)}
          onExitEdit={() => view?.dispatch({ effects: commitMessageEditEffect.of(null) })}
        />
      )}
    </div>
  );
};

/**
 * The tile stack's own controls, floated over the hovered row — quick reactions inline, the rest
 * behind the overflow menu. Reusing the component is the point: a second implementation would
 * drift from it, and these actions already live in the action graph.
 */
const HoverControls = forwardRef<
  HTMLDivElement,
  { message: MessageLike; editing: boolean; onEdit: () => void; onExitEdit: () => void }
>(({ message, editing, onEdit, onExitEdit }, forwardedRef) => {
  // One state atom per hovered row, so edit mode and the picker reset when the pointer moves on —
  // and seeded from the host, so mounting over a row that is already being edited agrees with it
  // from the first render. Anything else has to detect that agreement in an effect, which under
  // StrictMode's double invocation reads as the toolbar leaving edit mode: re-hovering an edited
  // message committed it.
  const [state] = useState(() => makeMessageState({ editing }));
  // `Message.Controls` answers Edit by flipping this atom — it has no callback — because in the tile
  // stack the same component renders the body. Here the body is the document, so the two have to be
  // reconciled, and which side moved is what says which way: the host moving is a commit or a cancel
  // for the toolbar to follow, the toolbar moving is a request for the host to answer.
  const { editing: controlsEditing } = useAtomValue(state);
  const setState = useAtomSet(state);
  const hostRef = useRef(editing);
  const onEditRef = useDynamicRef(onEdit);
  const onExitEditRef = useDynamicRef(onExitEdit);
  useEffect(() => {
    const hostMoved = hostRef.current !== editing;
    hostRef.current = editing;
    if (controlsEditing === editing) {
      return;
    }

    if (hostMoved) {
      // Committing with the keyboard never reaches the toolbar, which left ✓/✗ showing until the
      // pointer moved to another row.
      setState((current) => ({ ...current, editing }));
    } else {
      (controlsEditing ? onEditRef : onExitEditRef).current();
    }
  }, [controlsEditing, editing, setState, onEditRef, onExitEditRef]);

  return (
    // Straddling the row's top edge at the end of the row, where Discord puts it — the corner
    // least likely to cover text. `sm` is already the design system's tightest density.
    <div className='absolute z-1 end-2 -translate-y-1/2' data-testid='thread.document.toolbar' ref={forwardedRef}>
      <DensityProvider density='sm'>
        <Message.Controls message={message as MessageType.Message} state={state} />
      </DensityProvider>
    </div>
  );
});

type MessageChromeProps = {
  portal: MessagePortal;
  handlers: Omit<MessageDocumentProps, 'classNames' | 'messages' | 'editingId' | 'currentId'>;
};

/**
 * Every piece of a message that is not its body, rendered with the tile stack's own components.
 *
 * The point of portaling rather than drawing these in the widget is that they are then the *same*
 * components: the add-reaction pill, the `Tag` variants, the quote's arrow and the thread row's
 * wording all come from one implementation instead of a lookalike that drifts from it.
 */
const MessageChrome = ({ portal, handlers }: MessageChromeProps) => {
  const { message, kind, continues } = portal;
  const metadata = handlers.getMetadata(message);
  // `Message.Reactions` drives its picker from this atom, one per row, as the tile does.
  const state = useMemo(makeMessageState, [message.id]);
  switch (kind) {
    case 'head':
      return (
        <Message.Root {...metadata} continues={continues}>
          <Message.Heading authorName={metadata.authorName} timestamp={metadata.timestamp} />
        </Message.Root>
      );
    case 'quote':
      return <Message.Quote message={message as MessageType.Message} />;
    case 'reactions':
      return (
        <Message.Reactions
          reactions={handlers.getReactions?.(message) ?? []}
          onReact={(emoji: string) => handlers.onReact?.(message, emoji)}
          state={state}
        />
      );
    case 'thread':
      return (
        <Message.ThreadLink
          summary={handlers.getThreadSummary?.(message)}
          onOpen={() => handlers.onThreadOpen?.(message)}
        />
      );
  }
};
