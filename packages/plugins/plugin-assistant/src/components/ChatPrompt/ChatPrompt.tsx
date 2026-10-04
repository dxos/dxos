//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import type * as Chat from '@dxos/assistant/Chat';
import { type Event } from '@dxos/async';
import * as Project from '@dxos/compute/Project';
import { type Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { type ThemedClassName, useDynamicRef, useTranslation } from '@dxos/react-ui';
import {
  ChatEditor,
  type ChatEditorController,
  type ChatEditorProps,
  ChatStatusIndicator,
  commands,
} from '@dxos/react-ui-chat';
import type { ActionGraphProps } from '@dxos/react-ui-menu';
import { pendingText } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { type Merge } from '@dxos/util';

import { useChatKeymapExtensions } from '#hooks';
import { meta } from '#meta';
import { AssistantPreset } from '#types';

import { TaskSlashCommands } from '../../commands/index.ts';
import { type AiChatProcessor, getProcessorState } from '../../processor/index.ts';
import { type ChatEvent } from '../Chat/index.ts';
import { ChatActions, type ChatActionsProps } from './ChatActions.tsx';
import { ChatMcpErrors } from './ChatMcpErrors.tsx';
import { ChatOptions } from './ChatOptions.tsx';
import { ChatReferences } from './ChatReferences.tsx';
import { useChatVoiceInput } from './useChatVoiceInput.ts';

export type ChatPromptProps = Merge<
  ThemedClassName<{
    outline?: boolean;
    settings?: boolean;
    expandable?: boolean;
    db?: Database.Database;
    chat?: Chat.Chat;
    /** Undefined while the processor is still opening: the prompt takes text but holds it until then. */
    processor?: AiChatProcessor;
    event: Event<ChatEvent>;
    /** Whether the checklist beside the prompt is shown; the toggle renders only when provided. */
    tasksVisible?: boolean;
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
  processor,
  event,
  tasksVisible,
  attendableId,
  customActions,
  nodeId,
  placeholder,
  autoFocus = true,
  onPresetChange,
  settings = true,
  presets,
  preset,
  companionTo,
}: ChatPromptProps) => {
  const { t } = useTranslation(meta.profile.key);
  const processorState = getProcessorState(processor);
  const error = useAtomValue(processorState.error).pipe(Option.getOrUndefined);
  const streaming = useAtomValue(processorState.streaming);
  const active = useAtomValue(processorState.active);

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

  // Command completion: `$` sentinels come from the bound project's instructions; `/` commands
  // are the deterministic operation shortcuts (see assistant-toolkit `SlashCommands`).
  const [companion] = useObject(companionTo);
  const [instructions] = useObject(Obj.instanceOf(Project.Project, companion) ? companion.instructions : undefined);
  const commandsRef = useDynamicRef(instructions?.commands ?? []);
  const commandsExtension = useMemo(
    () =>
      commands({
        getCommands: () => [
          ...commandsRef.current.map(({ sentinel, description }) => ({ sentinel, description })),
          ...TaskSlashCommands.map(({ command, description }) => ({ sentinel: command, description })),
        ],
      }),
    [commandsRef],
  );

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

  const canSend = hasText && processor != null;

  const extensions = useMemo(
    () => [keymapExtensions, pendingText(), commandsExtension, emptinessExtension],
    [keymapExtensions, commandsExtension, emptinessExtension],
  );

  // Submits while a turn is running too: the agent's input queue is feed state, so the prompt is
  // queued behind the running turn rather than dropped (`Chat.Root` routes it to `enqueue`).
  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      if (!processor) {
        return false;
      }
      event.emit({ type: 'submit', text });
      return true;
    },
    [event, processor],
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
    <div
      data-testid='assistant.prompt'
      role='group'
      className={mx(
        'flex flex-col w-full dx-density-md',
        outline &&
          'dx-group-surface rounded-sm border border-separator-subtle transition transition-border [&:has(.cm-content:focus)]:border-separator',
        classNames,
      )}
    >
      {processor && <ChatMcpErrors processor={processor} />}

      <div className='flex p-2 gap-2'>
        <ChatStatusIndicator classNames='p-1' preset={preset} error={error} processing={streaming} />
        <ChatEditor
          ref={editorRef}
          autoFocus={autoFocus}
          markdown
          lineWrapping
          classNames='col-span-2 pt-0.5'
          placeholder={placeholder ?? t('prompt.placeholder')}
          extensions={extensions}
          onSubmit={handleSubmit}
        />
      </div>

      {db &&
        settings && (
          // One toolbar for the row: the options and context chips lead, the chips' track takes the slack, the actions end it.
          <ChatActions
            classNames='p-1.5'
            attendableId={attendableId}
            customActions={customActions}
            // `active`, not `streaming`: a turn parked in a tool call streams nothing,
            // and the reader still needs a way to stop it.
            processing={active}
            canSend={canSend}
            tasksVisible={tasksVisible}
            onSend={handleSend}
            onEvent={handleEvent}
            leading={
              <>
                <ChatOptions
                  db={db}
                  chat={chat}
                  registry={processor?.registry}
                  context={processor?.context}
                  preset={preset}
                  presets={presets}
                  onPresetChange={onPresetChange}
                />
                <div className='flex h-6 grow min-w-0 overflow-x-auto scrollbar-none'>
                  {processor && <ChatReferences db={db} context={processor.context} />}
                </div>
              </>
            }
          />
        )}
    </div>
  );
};

ChatPrompt.displayName = 'Chat.Prompt';
