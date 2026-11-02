//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';
import React, {
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as ObjectCombobox from '@dxos/app-toolkit/ObjectCombobox';
import { type AiContext } from '@dxos/assistant';
import type * as SlashCommand from '@dxos/assistant-toolkit/SlashCommand';
import type * as Chat from '@dxos/assistant/Chat';
import { type Event } from '@dxos/async';
import * as Project from '@dxos/compute/Project';
import { type Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as ConnectorAuth from '@dxos/plugin-connector/ConnectorAuth';
import * as SearchOperation from '@dxos/plugin-search/SearchOperation';
import {
  ChatEditor,
  type ChatEditorController,
  type ChatEditorProps,
  ChatStatusIndicator,
  commands,
  openCommandCompletion,
} from '@dxos/react-ui-chat';
import type { ActionGraphProps } from '@dxos/react-ui-menu';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import type * as Util from '@dxos/react-ui/Util';
import { objectLinks, pendingText } from '@dxos/ui-editor';
import { type Merge } from '@dxos/util';

import { insertMention, mentionText, useAttachFile, useChatKeymapExtensions, useObjectMentions } from '#hooks';
import { AssistantPreset } from '#types';

import { type ChatModel, getChatModelState } from '../../chat-model/index.ts';
import { AssistantNamespace } from '../../namespace.ts';
import { type ChatEvent } from '../Chat/index.ts';
import { attachmentAnchors, dropAnchor, insertAtAnchor, placeAnchor } from './attachment-anchors.ts';
import { ChatActions, type ChatActionsProps } from './ChatActions.tsx';
import { ChatAddMenu } from './ChatAddMenu.tsx';
import { ChatAgentPicker } from './ChatAgentPicker.tsx';
import { type Attachment, ChatAttachments } from './ChatAttachments.tsx';
import { ChatMcpErrors } from './ChatMcpErrors.tsx';
import { useChatVoiceInput } from './useChatVoiceInput.ts';

/** Prompts that may wait behind a running turn, by default. */
export const DEFAULT_MAX_QUEUE = 3;

export type ChatPromptProps = Merge<
  Util.ThemedClassName<{
    outline?: boolean;
    settings?: boolean;
    expandable?: boolean;
    db?: Database.Database;
    chat?: Chat.Chat;
    /** Undefined while the chat model is still opening: the prompt takes text but holds it until then. */
    chatModel?: ChatModel;
    /**
     * Bindings for a draft with no chat model, whose caller handles the submit event: backs the context
     * controls and lets the prompt send.
     */
    context?: AiContext.Binder;
    slashCommands?: readonly SlashCommand.SlashCommand[];
    event: Event<ChatEvent>;
    drawers?: ChatActionsProps['drawers'];
    /** Attention id of the surface: scopes the toolbar and pivots the panels the prompt opens. */
    attendableId?: string;
    /** Actions other plugins filed on this prompt's node (see `ChatActions`). */
    customActions?: Atom.Atom<ActionGraphProps>;
    /**
     * The graph node those actions were filed on. Keys the dictation session, because the mic that
     * opens it is one of them and carries the same id — anything else here is a session this prompt
     * would never hear.
     */
    nodeId?: string;
    placeholder?: ChatEditorProps['placeholder'];
    autoFocus?: boolean;
    /** How many prompts are waiting behind the running turn. */
    queueSize?: number;
    /** The most prompts that may wait behind a running turn; past it the prompt takes no more until one is taken up. */
    maxQueue?: number;
    /** Whether the conversation has begun, which fixes its agent. */
    started?: boolean;
    /** Object the chat is attached to; its project instructions (if any) supply sentinel-command completion. */
    companionTo?: Obj.Unknown;
  }>,
  AssistantPreset.ChatPresetProps
>;

const NO_COMMANDS: readonly SlashCommand.SlashCommand[] = [];

export const ChatPrompt = ({
  classNames,
  outline,
  db,
  chat,
  chatModel,
  context: draftContext,
  slashCommands = NO_COMMANDS,
  event,
  drawers,
  attendableId,
  customActions,
  nodeId,
  placeholder,
  autoFocus = true,
  queueSize = 0,
  maxQueue = DEFAULT_MAX_QUEUE,
  settings = true,
  presets,
  preset,
  companionTo,
  started,
  onPresetChange,
}: ChatPromptProps) => {
  const { t } = Hooks.useTranslation(AssistantNamespace.key);
  const chatModelState = getChatModelState(chatModel);
  const error = useAtomValue(chatModelState.error).pipe(Option.getOrUndefined);
  const streaming = useAtomValue(chatModelState.streaming);
  const active = useAtomValue(chatModelState.active);
  const context = chatModel?.context ?? draftContext;

  const editorRef = useRef<ChatEditorController>(null);
  useEffect(() => {
    return event.on((ev) => {
      if (ev.type === 'update-prompt' && !editorRef.current?.getText()?.length) {
        editorRef.current?.setText(ev.text);
        editorRef.current?.focus();
      }
    });
  }, [event]);

  const fallbackDocId = useId();
  // The prompt node the mic action was filed on, which is what it keys the recording session by. The
  // object id is only the fallback for a prompt rendered outside the app graph.
  const docId = nodeId ?? (chat ? Obj.getURI(chat) : fallbackDocId);
  useChatVoiceInput(docId, editorRef);

  const keymapExtensions = useChatKeymapExtensions({ event });

  const [companion] = useObject(companionTo);
  const [instructions] = useObject(Obj.instanceOf(Project.Project, companion) ? companion.instructions : undefined);
  const commandsRef = Hooks.useDynamicRef([
    ...(instructions?.commands ?? []).map(({ sentinel, description }) => ({ sentinel, description })),
    ...slashCommands.map(({ command, description }) => ({ sentinel: command, description })),
  ]);
  const commandsExtension = useMemo(() => commands({ getCommands: () => commandsRef.current }), [commandsRef]);

  const mentions = useObjectMentions({ db });

  const handleMention = useCallback(
    (object: Obj.Unknown) => {
      const view = editorRef.current?.view;
      if (view) {
        insertMention(view, object, ObjectCombobox.objectLabel(object, t));
      }
    },
    [t],
  );

  const attachFile = useAttachFile(db);
  const [pending, setPending] = useState<readonly Attachment[]>([]);
  const [failed, setFailed] = useState<readonly Attachment[]>([]);
  const nextAttachment = useRef(0);
  const attaching = useRef(new Map<number, AbortController>());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFiles = useCallback(
    async (files: readonly globalThis.File[], pos?: number) => {
      const view = editorRef.current?.view;
      if (!attachFile || !view) {
        return;
      }
      const attachments = files.map((file) => ({ id: nextAttachment.current++, name: file.name, file }));
      for (const { id } of attachments) {
        placeAnchor(view, id, pos);
      }
      setPending((current) => [...current, ...attachments.map(({ id, name }) => ({ id, name }))]);
      await Promise.all(
        attachments.map(async ({ id, name, file }) => {
          const controller = new AbortController();
          attaching.current.set(id, controller);
          try {
            const object = await attachFile(file, controller.signal);
            insertAtAnchor(view, id, mentionText(object, ObjectCombobox.objectLabel(object, t)));
          } catch (error) {
            dropAnchor(view, id);
            if (!controller.signal.aborted) {
              setFailed((current) => [
                ...current,
                { id, name, error: error instanceof Error ? error : new Error(String(error)) },
              ]);
            }
          } finally {
            attaching.current.delete(id);
            setPending((current) => current.filter((attachment) => attachment.id !== id));
          }
        }),
      );
    },
    [attachFile, t],
  );
  const handleCancelPending = useCallback(() => {
    const view = editorRef.current?.view;
    for (const [id, controller] of attaching.current) {
      controller.abort();
      if (view) {
        dropAnchor(view, id);
      }
    }
    setPending([]);
  }, []);
  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void handleFiles(Array.from(event.target.files ?? []));
      event.target.value = '';
      editorRef.current?.view?.focus();
    },
    [handleFiles],
  );
  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (attachFile && event.dataTransfer.types.includes('Files')) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }
    },
    [attachFile],
  );
  const handleDrop = useCallback(
    (event: DragEvent) => {
      const files = Array.from(event.dataTransfer.files);
      if (attachFile && files.length > 0) {
        // Captured, so CodeMirror's own drop handler does not read the file in as text.
        event.preventDefault();
        event.stopPropagation();
        const view = editorRef.current?.view;
        const onText = view && event.target instanceof Node && view.contentDOM.contains(event.target);
        void handleFiles(
          files,
          onText ? (view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? undefined) : undefined,
        );
        view?.focus();
      }
    },
    [attachFile, handleFiles],
  );
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData.files);
      if (attachFile && files.length > 0 && !event.clipboardData.types.includes('text/plain')) {
        event.preventDefault();
        event.stopPropagation();
        void handleFiles(files);
      }
    },
    [attachFile, handleFiles],
  );

  const { invokePromise } = AppHooks.useOperationInvoker();
  const handleAddObject = useCallback(async () => {
    const { data: object } = await invokePromise(SearchOperation.SelectObject, {
      spaceId: db?.spaceId,
      title: t('add-object.title'),
    });
    if (object) {
      handleMention(object);
      editorRef.current?.view?.focus();
    }
  }, [invokePromise, handleMention, db, t]);

  // The space's connections are managed in its settings, opened beside this chat rather than in place of it.
  const handleManageConnections = useCallback(() => {
    if (db) {
      void invokePromise(LayoutOperation.Open, {
        subject: [ConnectorAuth.connectionsSubject(db.spaceId)],
        pivotId: attendableId,
        disposition: 'add',
      });
    }
  }, [invokePromise, db, attendableId]);
  const handleCommands = useCallback(() => {
    const view = editorRef.current?.view;
    if (view) {
      openCommandCompletion(view);
    }
  }, []);

  // The editor owns the prompt text; only its emptiness is mirrored into React so the send control
  // can disable itself without re-rendering the prompt on every keystroke's content. Dictation is
  // deliberately not counted: pending text lives in a StateField and reaches the document only when
  // the user confirms it, which is the same point at which Enter would stop committing and start
  // submitting.
  const [hasText, setHasText] = useState(false);
  const emptinessExtension = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          setHasText(update.state.doc.toString().trim().length > 0);
        }
      }),
    [],
  );

  // A full queue stops taking prompts: what is typed stays in the editor until the agent takes one up.
  const queueFull = active && queueSize >= maxQueue;
  const canSend = hasText && context != null && !queueFull && pending.length === 0;

  const extensions = useMemo(
    () => [keymapExtensions, pendingText(), objectLinks(), attachmentAnchors(), commandsExtension, emptinessExtension],
    [keymapExtensions, commandsExtension, emptinessExtension],
  );

  // Submits while a turn is running too: the agent's input queue is feed state, so the prompt is
  // queued behind the running turn rather than dropped (`Chat.Root` sends it through the chat model's
  // outbox, which queues it while the agent is busy).
  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      if (!context || queueFull || pending.length > 0) {
        return false;
      }
      event.emit({ type: 'submit', text });
      return true;
    },
    [event, context, queueFull, pending],
  );

  // Routed through `handleSubmit` so the button and the Enter keybinding share one submit path;
  // the reset and refocus mirror what the `submit()` extension does for Enter.
  const handleSend = useCallback(() => {
    const text = editorRef.current?.getText().trim();
    if (!text?.length) {
      return;
    }
    if (handleSubmit(text)) {
      editorRef.current?.setText('', true);
    }
  }, [handleSubmit]);

  const handleEvent = useCallback<NonNullable<ChatActionsProps['onEvent']>>(
    (ev) => {
      event.emit(ev);
    },
    [event],
  );

  return (
    <Layout.Flex
      column
      asChild
      classNames={[
        'w-full dx-density-md',
        outline &&
          'dx-group-surface rounded-sm border border-separator-subtle transition transition-border [&:has(.cm-content:focus)]:border-separator',
        classNames,
      ]}
    >
      <div
        data-testid='assistant.prompt'
        role='group'
        onDragOverCapture={handleDragOver}
        onDropCapture={handleDrop}
        onPasteCapture={handlePaste}
      >
        {chatModel && <ChatMcpErrors chatModel={chatModel} />}
        <ChatAttachments
          pending={pending}
          failed={failed}
          onCancel={handleCancelPending}
          onDismiss={() => setFailed([])}
        />

        <Layout.Flex gap='sm' classNames='p-2'>
          <ChatStatusIndicator classNames='p-1' preset={preset} error={error} processing={streaming} />
          <ChatEditor
            ref={editorRef}
            autoFocus={autoFocus}
            markdown
            lineWrapping
            classNames='col-span-2 pt-0.5'
            placeholder={placeholder ?? t('prompt.placeholder')}
            extensions={extensions}
            menu={mentions}
            onSubmit={handleSubmit}
          />
        </Layout.Flex>

        {db && settings && (
          <>
            <ChatActions
              classNames='p-1.5'
              attendableId={attendableId}
              customActions={customActions}
              processing={active}
              canSend={canSend}
              drawers={drawers}
              onSend={handleSend}
              onEvent={handleEvent}
              leading={
                <>
                  <ChatAddMenu
                    db={db}
                    context={context}
                    disabled={!context}
                    onAddFiles={attachFile ? () => fileInputRef.current?.click() : undefined}
                    onAddObject={() => void handleAddObject()}
                    onCommands={handleCommands}
                    onManageConnections={handleManageConnections}
                  />
                  <ChatAgentPicker
                    chat={chat}
                    started={started}
                    presets={presets}
                    preset={preset}
                    onPresetChange={onPresetChange}
                  />
                  <Layout.Flex grow />
                </>
              }
            />
            <input hidden type='file' multiple onChange={handleFileChange} ref={fileInputRef} />
          </>
        )}
      </div>
    </Layout.Flex>
  );
};

ChatPrompt.displayName = 'Chat.Prompt';
