//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useState } from 'react';

import { type Blueprint, type BlueprintRegistry } from '@dxos/assistant';
import { useVoiceInput } from '@dxos/plugin-transcription';
import { type ThemedClassName, Toolbar, useForwardedRef, useTranslation } from '@dxos/react-ui';
import { ChatEditor, type ChatEditorController, type ChatEditorProps } from '@dxos/react-ui-chat';
import { mx } from '@dxos/react-ui-theme';

import { ChatActionButtons } from './ChatActionButtons';
import { ChatOptionsMenu, type ChatOptionsMenuProps } from './ChatOptionsMenu';
import { ChatStatusIndicator } from './ChatStatusIndicator';
import { meta } from '../../meta';

export type ChatPromptProps = ThemedClassName<
  Omit<ChatEditorProps, 'classNames'> & {
    // TODO(burdon): Split components.
    compact?: boolean;
    microphone?: boolean;
    error?: Error;
    processing?: boolean;
  } & {
    blueprintRegistry?: BlueprintRegistry;
    blueprints?: Blueprint[];

    // TODO(burdon): Factor out.
    // blueprints?: TagPickerItemData[];
    // onSearchBlueprints?: TagPickerOptions['onSearch'];
    // onUpdateBlueprints?: TagPickerOptions['onUpdate'];

    onScroll?: () => void;
  }
>;

export const ChatPrompt = forwardRef<ChatEditorController, ChatPromptProps>(
  (
    {
      classNames,
      compact = true,
      microphone,
      error,
      processing,
      blueprintRegistry,
      blueprints,
      onCancel,
      onScroll,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.id);
    const promptRef = useForwardedRef<ChatEditorController>(forwardedRef);
    const [active, setActive] = useState(false);

    // TODO(burdon): Configure capability in TranscriptionPlugin.
    const { recording } = useVoiceInput({
      active,
      onUpdate: (text) => {
        promptRef.current?.setText(text);
        promptRef.current?.focus();
      },
    });

    const handleUpdateBlueprints = useCallback<NonNullable<ChatOptionsMenuProps['onChange']>>(
      (key: string, active: boolean) => {},
      [],
    );

    if (compact) {
      return (
        <div
          className={mx(
            'flex shrink-0 w-full items-center overflow-hidden',
            'grid grid-cols-[var(--rail-action)_1fr_min-content]',
            classNames,
          )}
          onClick={() => promptRef.current?.focus()}
        >
          <div className='flex h-[--rail-action] items-center justify-center'>
            <ChatStatusIndicator error={error} processing={processing} />
          </div>

          <ChatEditor {...props} ref={promptRef} />

          <div className='flex h-[--rail-action] items-center justify-center'>
            <ChatActionButtons
              microphone={microphone}
              processing={processing}
              recording={recording}
              onCancel={onCancel}
              onScroll={onScroll}
              onRecordChange={setActive}
            />
          </div>
        </div>
      );
    }

    return (
      <div className={mx('flex flex-col shrink-0 w-full', classNames)}>
        <div className='flex grid grid-cols-[var(--rail-action)_1fr]'>
          <div className='flex h-[--rail-action] items-center justify-center'>
            <ChatStatusIndicator error={error} processing={processing} />
          </div>

          <ChatEditor classNames='pbs-2 w-full' lineWrapping {...props} ref={promptRef} />
        </div>

        <Toolbar.Root classNames='bg-transparent overflow-visible'>
          {blueprintRegistry && (
            <ChatOptionsMenu
              blueprints={blueprints}
              blueprintRegistry={blueprintRegistry}
              onChange={handleUpdateBlueprints}
            />
          )}

          {/* {(onSearchBlueprints && (
            <TagPicker
              classNames='w-full'
              mode='multi-select'
              items={blueprints ?? []}
              placeholder={t('blueprints placeholder')}
              onSearch={onSearchBlueprints}
              onUpdate={onUpdateBlueprints}
            />
          )) || <div className='flex-1' />} */}
          <div className='flex-1' />

          <ChatActionButtons
            microphone={microphone}
            processing={processing}
            recording={recording}
            onCancel={onCancel}
            onScroll={onScroll}
            onRecordChange={setActive}
          />
        </Toolbar.Root>
      </div>
    );
  },
);
