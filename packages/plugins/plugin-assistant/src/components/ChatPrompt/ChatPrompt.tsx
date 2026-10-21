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
import { type AiContext } from '@dxos/assistant';
import type * as Chat from '@dxos/assistant/Chat';
import { type Event } from '@dxos/async';
import * as Project from '@dxos/compute/Project';
import { type Database, Obj, type Registry } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
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

import { insertMention, useAttachFiles, useChatKeymapExtensions, useObjectMentions, useSlashCommands } from '#hooks';
import { meta } from '#meta';
import { AssistantPreset } from '#types';

import { type ChatModel, getChatModelState } from '../../chat-model/index.ts';
import { type ChatEvent } from '../Chat/index.ts';
import { McpServersDialog } from '../McpServers/index.ts';
import { ChatActions, type ChatActionsProps } from './ChatActions.tsx';
import { ChatAddMenu } from './ChatAddMenu.tsx';
import { ChatAgentPicker } from './ChatAgentPicker.tsx';
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
    /** Skill registry for the context controls when there is no chat model. */
    registry?: Registry.Registry;
    event: Event<ChatEvent>;
    /** The drawers above the prompt and the one that is open (see `ChatActions`). */
    drawers?: ChatActionsProps['drawers'];
    /** The prompt's graph node, which is what contributed actions are filed under. */
    attendableId?: string;
    /** Toolbar actions other plugins filed on this chat's node (see `ChatActions`). */
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

export const ChatPrompt = ({
  classNames,
  outline,
  db,
  chat,
  chatModel,
  context: draftContext,
  registry: draftRegistry,
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const chatModelState = getChatModelState(chatModel);
  const error = useAtomValue(chatModelState.error).pipe(Option.getOrUndefined);
  const streaming = useAtomValue(chatModelState.streaming);
  const active = useAtomValue(chatModelState.active);
  const context = chatModel?.context ?? draftContext;
  const registry = chatModel?.registry ?? draftRegistry;

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
  // The node the mic action was filed on, which is what it keys the recording session by. A chat
  // rendered as a companion is a companion node, not the chat object's own, so the object id is only
  // the fallback for a prompt rendered outside a plank.
  const docId = nodeId ?? (chat ? Obj.getURI(chat) : fallbackDocId);
  useChatVoiceInput(docId, editorRef);

  const keymapExtensions = useChatKeymapExtensions({ event });

  // Command completion: `$` sentinels come from the bound project's instructions; `/` commands are
  // what plugins contribute plus one per skill, run without the model (see `Chat.Root`).
  const [companion] = useObject(companionTo);
  const [instructions] = useObject(Obj.instanceOf(Project.Project, companion) ? companion.instructions : undefined);
  const slashCommands = useSlashCommands({ registry, db });
  const commandsRef = Hooks.useDynamicRef([
    ...(instructions?.commands ?? []).map(({ sentinel, description }) => ({ sentinel, description })),
    ...slashCommands.map(({ command, description }) => ({ sentinel: command, description })),
  ]);
  const commandsExtension = useMemo(() => commands({ getCommands: () => commandsRef.current }), [commandsRef]);

  // `@` mentions: picking an object inserts a link to it and binds it into the context.
  const mentions = useObjectMentions({ db });

  const handleMention = useCallback(
    (object: Obj.Unknown) => {
      const view = editorRef.current?.view;
      if (view) {
        insertMention(view, object, Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id);
      }
    },
    [context],
  );

  // Files become objects in the space, then mentions like any other object.
  const attachFiles = useAttachFiles(db);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFiles = useCallback(
    async (files: readonly globalThis.File[]) => {
      for (const object of (await attachFiles?.(files)) ?? []) {
        handleMention(object);
      }
    },
    [attachFiles, handleMention],
  );
  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      void handleFiles(Array.from(event.target.files ?? []));
      event.target.value = '';
    },
    [handleFiles],
  );
  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (attachFiles && event.dataTransfer.types.includes('Files')) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }
    },
    [attachFiles],
  );
  const handleDrop = useCallback(
    (event: DragEvent) => {
      const files = Array.from(event.dataTransfer.files);
      if (attachFiles && files.length > 0) {
        // Captured, so the editor does not insert the file's bytes as text.
        event.preventDefault();
        event.stopPropagation();
        void handleFiles(files);
      }
    },
    [attachFiles, handleFiles],
  );
  // Only a paste that is nothing but files: a paste carrying text as well belongs to the editor.
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData.files);
      if (attachFiles && files.length > 0 && !event.clipboardData.types.includes('text/plain')) {
        event.preventDefault();
        event.stopPropagation();
        void handleFiles(files);
      }
    },
    [attachFiles, handleFiles],
  );

  // The app's search dialog, as a picker: the object it returns becomes a mention.
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

  const [mcpServersOpen, setMcpServersOpen] = useState(false);
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
  const canSend = hasText && context != null && !queueFull;

  // Object links show as the same chips the markdown editor draws, not as their link markup.
  const extensions = useMemo(
    () => [keymapExtensions, pendingText(), objectLinks(), commandsExtension, emptinessExtension],
    [keymapExtensions, commandsExtension, emptinessExtension],
  );

  // Submits while a turn is running too: the agent's input queue is feed state, so the prompt is
  // queued behind the running turn rather than dropped (`Chat.Root` sends it through the chat model's
  // outbox, which queues it while the agent is busy).
  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      if (!context || queueFull) {
        return false;
      }
      event.emit({ type: 'submit', text });
      return true;
    },
    [event, context, queueFull],
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
      {/* A plain element: the drop and paste handlers are captured here, ahead of the editor. */}
      <div
        data-testid='assistant.prompt'
        role='group'
        onDragOverCapture={handleDragOver}
        onDropCapture={handleDrop}
        onPasteCapture={handlePaste}
      >
        {chatModel && <ChatMcpErrors chatModel={chatModel} />}

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
            {/* One toolbar for the row: what can go into the message and who answers it lead, the actions end it. */}
            <ChatActions
              classNames='p-1.5'
              attendableId={attendableId}
              customActions={customActions}
              // `active`, not `streaming`: a turn parked in a tool call streams nothing,
              // and the reader still needs a way to stop it.
              processing={active}
              canSend={canSend}
              drawers={drawers}
              onSend={handleSend}
              onEvent={handleEvent}
              leading={
                <>
                  <ChatAddMenu
                    db={db}
                    disabled={!context}
                    onAddFiles={attachFiles ? () => fileInputRef.current?.click() : undefined}
                    onAddObject={() => void handleAddObject()}
                    onCommands={handleCommands}
                    onManageMcpServers={() => setMcpServersOpen(true)}
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
            <McpServersDialog db={db} open={mcpServersOpen} onOpenChange={setMcpServersOpen} />
          </>
        )}
      </div>
    </Layout.Flex>
  );
};

ChatPrompt.displayName = 'Chat.Prompt';
