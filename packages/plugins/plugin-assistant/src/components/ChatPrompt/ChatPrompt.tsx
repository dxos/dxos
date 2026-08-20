//
// Copyright 2025 DXOS.org
//

import { EditorView } from '@codemirror/view';
import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { type Chat } from '@dxos/assistant-toolkit';
import { type Event } from '@dxos/async';
import * as Project from '@dxos/compute/Project';
import { type Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { Input, type ThemedClassName, useDynamicRef, useMediaQuery, useTranslation } from '@dxos/react-ui';
import {
  ChatEditor,
  type ChatEditorController,
  type ChatEditorProps,
  ChatStatusIndicator,
  commands,
} from '@dxos/react-ui-chat';
import { pendingText } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { type Merge } from '@dxos/util';

import { useChatKeymapExtensions } from '#hooks';
import { meta } from '#meta';
import { AssistantPreset } from '#types';

import { type AiChatProcessor } from '../../processor';
import { type ChatEvent } from '../Chat';
import { ChatActions, type ChatActionsProps } from './ChatActions';
import { ChatMcpErrors } from './ChatMcpErrors';
import { ChatOptions } from './ChatOptions';
import { ChatReferences } from './ChatReferences';
import { useChatVoiceInput } from './useChatVoiceInput';

export type ChatPromptProps = Merge<
  ThemedClassName<{
    outline?: boolean;
    settings?: boolean;
    expandable?: boolean;
    db?: Database.Database;
    chat?: Chat.Chat;
    processor: AiChatProcessor;
    event: Event<ChatEvent>;
    /** Read-only indicator of whether the configured provider is the remote (online) service. */
    online?: boolean;
    placeholder?: ChatEditorProps['placeholder'];
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
  online,
  placeholder,
  onPresetChange,
  settings = true,
  presets,
  preset,
  companionTo,
}: ChatPromptProps) => {
  const { t } = useTranslation(meta.profile.key);

  // The online switch is a read-only indicator of a setting configured elsewhere, so it is the first
  // thing to drop when the action row has to compete with the send control for width. `md` is the
  // deck's own mobile threshold (`useBreakpoints`), and a viewport query (not the boot-time platform
  // capability) so a narrow desktop window sheds it too.
  const [wideEnoughForIndicators] = useMediaQuery('md');

  const error = useAtomValue(processor.error).pipe(Option.getOrUndefined);
  const streaming = useAtomValue(processor.streaming);
  const active = useAtomValue(processor.active);
  const activeRef = useDynamicRef(active);

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
  const docId = chat?.id ?? fallbackDocId;
  useChatVoiceInput(docId, editorRef);

  const keymapExtensions = useChatKeymapExtensions({ event });

  // Sentinel-command completion is sourced from the bound project's instructions, if any.
  const [companion] = useObject(companionTo);
  const [instructions] = useObject(Obj.instanceOf(Project.Project, companion) ? companion.instructions : undefined);
  const commandsRef = useDynamicRef(instructions?.commands ?? []);
  const commandsExtension = useMemo(
    () =>
      commands({
        getCommands: () => commandsRef.current.map(({ sentinel, description }) => ({ sentinel, description })),
      }),
    [commandsRef],
  );

  // The editor owns the prompt text; only its emptiness is mirrored into React so the send control
  // can disable itself without re-rendering the prompt on every keystroke's content.
  const [canSend, setCanSend] = useState(false);
  const emptinessExtension = useMemo(
    () =>
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          setCanSend(update.state.doc.toString().trim().length > 0);
        }
      }),
    [],
  );

  const extensions = useMemo(
    () => [keymapExtensions, pendingText(), commandsExtension, emptinessExtension],
    [keymapExtensions, commandsExtension, emptinessExtension],
  );

  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      if (!activeRef.current) {
        event.emit({ type: 'submit', text });
        return true;
      }
    },
    [event],
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
          'dx-group-surface rounded-sm border border-subdued-separator transition transition-border [&:has(.cm-content:focus)]:border-separator',
        classNames,
      )}
    >
      <ChatMcpErrors processor={processor} />

      <div className='flex p-2 gap-2'>
        <ChatStatusIndicator classNames='p-1' preset={preset} error={error} processing={streaming} />
        <ChatEditor
          ref={editorRef}
          autoFocus
          markdown
          lineWrapping
          classNames='col-span-2 pt-0.5'
          placeholder={placeholder ?? t('prompt.placeholder')}
          extensions={extensions}
          onSubmit={handleSubmit}
        />
      </div>

      {db && settings && (
        <div className='flex items-center overflow-hidden p-1.5'>
          <ChatOptions
            chat={chat}
            db={db}
            registry={processor.registry}
            context={processor.context}
            preset={preset}
            presets={presets}
            onPresetChange={onPresetChange}
          />

          <div className='flex h-6 grow overflow-x-auto scrollbar-none'>
            <ChatReferences db={db} context={processor.context} />
          </div>

          <ChatActions
            classNames='col-span-2'
            microphone={true}
            docId={docId}
            processing={streaming}
            canSend={canSend}
            onSend={handleSend}
            onEvent={handleEvent}
          >
            {online !== undefined && wideEnoughForIndicators && (
              <Input.Root>
                <Input.Label srOnly>{t('online-switch.label')}</Input.Label>
                {/* Read-only: the provider is configured in Assistant settings, not toggled here. */}
                <Input.Switch classNames='mx-1' checked={online} disabled />
              </Input.Root>
            )}
          </ChatActions>
        </div>
      )}
    </div>
  );
};

ChatPrompt.displayName = 'Chat.Prompt';
