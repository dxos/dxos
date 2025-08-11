//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { useRxValue } from '@effect-rx/rx-react';
import { Option } from 'effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DXN, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { useVoiceInput } from '@dxos/plugin-transcription';
import { Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps, references } from '@dxos/react-ui-chat';
import { mx } from '@dxos/react-ui-theme';
import { isNotFalsy } from '@dxos/util';

import { useBlueprints, useReferencesProvider } from '../../hooks';
import { meta } from '../../meta';
import { useChatContext } from '../ChatContext';

import { ChatActions, type ChatActionsProps } from './ChatActions';
import { ChatOptionsMenu } from './ChatOptionsMenu';
import { ChatPresets, type ChatPresetsProps } from './ChatPresets';
import { ChatReferences, type ChatReferencesProps } from './ChatReferences';
import { ChatStatusIndicator } from './ChatStatusIndicator';

//
// Prompt
//

type ChatPromptProps = ThemedClassName<
  Pick<ChatEditorProps, 'placeholder'> &
    Omit<ChatPresetsProps, 'onChange'> & {
      expandable?: boolean;
      online?: boolean;
      onChangeOnline?: (online: boolean) => void;
      onChangePreset?: ChatPresetsProps['onChange'];
    }
>;

const ChatPrompt = ({
  classNames,
  placeholder,
  expandable,
  online,
  presets,
  preset,
  onChangePreset,
  onChangeOnline,
}: ChatPromptProps) => {
  const { t } = useTranslation(meta.id);
  const { space, event, processor } = useChatContext(ChatPrompt.displayName);
  const streaming = useRxValue(processor.streaming);
  const error = useRxValue(processor.error).pipe(Option.getOrUndefined);

  const [active, setActive] = useState(false);
  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'record-start':
          setActive(true);
          break;
        case 'record-stop':
          setActive(false);
          break;
      }
    });
  }, [event]);

  const editorRef = useRef<ChatEditorController>(null);

  // TODO(burdon): Configure capability in TranscriptionPlugin.
  const { recording } = useVoiceInput({
    active,
    onUpdate: (text) => {
      editorRef.current?.setText(text);
      editorRef.current?.focus();
    },
  });

  const { active: activeBlueprints, onUpdate: handleUpdateBlueprints } = useBlueprints(
    space,
    processor.context,
    processor.blueprintRegistry,
  );

  // TODO(burdon): Reconcile with object tags.
  const referencesProvider = useReferencesProvider(space);
  const extensions = useMemo<Extension[]>(() => {
    return [
      referencesProvider && references({ provider: referencesProvider }),
      Prec.highest(
        keymap.of(
          [
            {
              key: 'cmd-d',
              preventDefault: true,
              run: () => {
                event.emit({ type: 'toggle-debug' });
                return true;
              },
            },
            expandable && {
              key: 'cmd-ArrowUp',
              preventDefault: true,
              run: () => {
                event.emit({ type: 'thread-open' });
                return true;
              },
            },
            expandable && {
              key: 'cmd-ArrowDown',
              preventDefault: true,
              run: () => {
                event.emit({ type: 'thread-close' });
                return true;
              },
            },
          ].filter(isNotFalsy),
        ),
      ),
    ].filter(isNotFalsy);
  }, [event, expandable, referencesProvider]);

  const handleSubmit = useCallback<NonNullable<ChatEditorProps['onSubmit']>>(
    (text) => {
      if (!streaming) {
        event.emit({ type: 'submit', text });
        return true;
      }
    },
    [streaming, event],
  );

  const handleEvent = useCallback<NonNullable<ChatActionsProps['onEvent']>>(
    (ev) => {
      event.emit(ev);
    },
    [event],
  );

  const handleUpdateReferences = useCallback<NonNullable<ChatReferencesProps['onUpdate']>>((dxns) => {
    log.info('update', { dxns });
    void processor.context.bind({ objects: dxns.map((dxn) => Ref.fromDXN(DXN.parse(dxn))) });
  }, []);

  return (
    <div
      className={mx(
        'is-full grid grid-cols-[var(--rail-action)_1fr_var(--rail-action)] grid-rows-[min-content_min-content_min-content]',
        classNames,
      )}
    >
      <div className='grid w-[var(--rail-action)] h-[var(--rail-action)] items-center justify-center'>
        <ChatStatusIndicator preset={preset} error={error} processing={streaming} />
      </div>

      <ChatEditor
        ref={editorRef}
        autoFocus
        lineWrapping
        classNames='col-span-2 pis-1 pbs-2'
        placeholder={placeholder ?? t('prompt placeholder')}
        extensions={extensions}
        onSubmit={handleSubmit}
      />

      <div />
      <ChatReferences
        classNames='col-span-2 flex pis-1 items-center'
        space={space}
        context={processor.context}
        onUpdate={handleUpdateReferences}
      />

      <ChatOptionsMenu
        registry={processor.blueprintRegistry}
        active={activeBlueprints}
        onChange={handleUpdateBlueprints}
      />

      <ChatActions
        classNames='col-span-2'
        microphone={true}
        recording={recording}
        processing={streaming}
        onEvent={handleEvent}
      >
        <>
          <div className='grow' />
          {presets && <ChatPresets preset={preset} presets={presets} onChange={onChangePreset} />}
          {online !== undefined && (
            <Input.Root>
              <Input.Switch classNames='mis-2 mie-2' checked={online} onCheckedChange={onChangeOnline} />
            </Input.Root>
          )}
        </>
      </ChatActions>
    </div>
  );
};

ChatPrompt.displayName = 'Chat.Prompt';

export { ChatPrompt };

export type { ChatPromptProps };
