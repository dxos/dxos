//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type Chat } from '@dxos/assistant-toolkit';
import { type Event } from '@dxos/async';
import { type Database } from '@dxos/echo';
import { type Merge } from '@dxos/effect';
import { useVoiceInput } from '@dxos/plugin-transcription';
import { Input, type ThemedClassName, useDynamicRef, useTranslation } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps } from '@dxos/react-ui-chat';
import { mx } from '@dxos/ui-theme';

import { useChatKeymapExtensions } from '#hooks';
import { meta } from '#meta';
import { type ChatPresetProps } from '#types';

import { type AiChatProcessor } from '../../processor';
import { type ChatEvent } from '../Chat/events';
import { ChatActions, type ChatActionsProps } from './ChatActions';
import { ChatMcpErrors } from './ChatMcpErrors';
import { ChatOptions } from './ChatOptions';
import { ChatReferences } from './ChatReferences';
import { ChatStatusIndicator } from './ChatStatusIndicator';

export type ChatPromptProps = ThemedClassName<
  Merge<
    {
      outline?: boolean;
      settings?: boolean;
      expandable?: boolean;
      db?: Database.Database;
      chat?: Chat.Chat;
      processor: AiChatProcessor;
      event: Event<ChatEvent>;
      online?: boolean;
      placeholder?: ChatEditorProps['placeholder'];
      onOnlineChange?: (online: boolean) => void;
    },
    ChatPresetProps
  >
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
  onOnlineChange,
  onPresetChange,
  settings = true,
  presets,
  preset,
}: ChatPromptProps) => {
  const { t } = useTranslation(meta.id);

  const error = useAtomValue(processor.error).pipe(Option.getOrUndefined);
  const streaming = useAtomValue(processor.streaming);
  const active = useAtomValue(processor.active);
  const activeRef = useDynamicRef(active);

  const editorRef = useRef<ChatEditorController>(null);
  const [recordingState, setRecordingState] = useState(false);
  useEffect(() => {
    return event.on((ev) => {
      switch (ev.type) {
        case 'update-prompt':
          if (!editorRef.current?.getText()?.length) {
            editorRef.current?.setText(ev.text);
            editorRef.current?.focus();
          }
          break;
        case 'record-start':
          setRecordingState(true);
          break;
        case 'record-stop':
          setRecordingState(false);
          break;
      }
    });
  }, [event]);

  // TODO(burdon): Configure capability in TranscriptionPlugin.
  const { recording } = useVoiceInput({
    active: recordingState,
    onUpdate: (text) => {
      editorRef.current?.setText(text);
      editorRef.current?.focus();
    },
  });

  const extensions = useChatKeymapExtensions({ event });

  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      if (!activeRef.current) {
        event.emit({ type: 'submit', text });
        return true;
      }
    },
    [event],
  );

  const handleEvent = useCallback<NonNullable<ChatActionsProps['onEvent']>>(
    (ev) => {
      event.emit(ev);
    },
    [event],
  );

  return (
    <div
      role='group'
      className={mx(
        'flex flex-col w-full dx-density-md',
        outline &&
          'bg-group-surface rounded-sm border border-subdued-separator transition transition-border [&:has(.cm-content:focus)]:border-separator',
        classNames,
      )}
    >
      <ChatMcpErrors processor={processor} />

      <div className='flex p-2 gap-2'>
        <ChatStatusIndicator classNames='p-1' preset={preset} error={error} processing={streaming} />
        <ChatEditor
          ref={editorRef}
          autoFocus
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
            recording={recording}
            processing={streaming}
            onEvent={handleEvent}
          >
            {online !== undefined && (
              <Input.Root>
                <Input.Label srOnly>{t('online-switch.label')}</Input.Label>
                <Input.Switch classNames='mx-1' checked={online} onCheckedChange={onOnlineChange} />
              </Input.Root>
            )}
          </ChatActions>
        </div>
      )}
    </div>
  );
};

ChatPrompt.displayName = 'Chat.Prompt';
