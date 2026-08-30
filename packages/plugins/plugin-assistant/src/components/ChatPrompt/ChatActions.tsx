//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { type ChatEvent } from '../Chat/events';
import { ChatAudioButton } from './ChatAudioButton';

/**
 * 44px at the 16px (pointer: fine) root font-size, the iOS HIG minimum touch target; the density
 * knobs cap a control at 40px, so a finger-driven control has to be sized past them. Applied only
 * where a finger is plausibly the pointer, so the desktop row keeps its density rhythm.
 */
const TOUCH_TARGET = 'max-md:size-11 pointer-coarse:size-11';

export type ChatActionsProps = ThemedClassName<
  PropsWithChildren<{
    docId?: string;
    microphone?: boolean;
    processing?: boolean;
    debug?: boolean;
    /** Submits the current prompt; the send control renders only when provided. */
    onSend?: () => void;
    /** Whether the prompt holds text and the processor would accept it; drives the send control's enablement. */
    canSend?: boolean;
    /** Whether the checklist beside the prompt is shown; the toggle renders only when provided. */
    tasksVisible?: boolean;
    onEvent?: (event: ChatEvent) => void;
  }>
>;

export const ChatActions = ({
  classNames,
  children,
  docId,
  microphone,
  processing,
  debug,
  onSend,
  canSend,
  tasksVisible,
  onEvent,
}: ChatActionsProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <div className={mx('flex items-center gap-1', classNames)}>
      {children}

      {microphone && <ChatAudioButton docId={docId} />}

      {debug && (
        <IconButton
          variant='ghost'
          icon='ph--wrench--regular'
          iconOnly
          label={t('debug.button')}
          onClick={() => onEvent?.({ type: 'toggle-debug' })}
        />
      )}

      {tasksVisible !== undefined && (
        <IconButton
          variant='ghost'
          classNames={mx(TOUCH_TARGET, tasksVisible && 'text-accent-text')}
          icon='ph--list-checks--regular'
          iconOnly
          aria-pressed={tasksVisible}
          label={t(tasksVisible ? 'hide-tasks.button' : 'show-tasks.button')}
          data-testid='assistant.toggle-tasks'
          onClick={() => onEvent?.({ type: 'toggle-tasks' })}
        />
      )}

      {/* One control, not two: send and stop are the same affordance at two moments of a turn, and
          as separate buttons one of them was always present and dead. Enter is the only other way to
          submit, and a touch keyboard offers no such affordance. */}
      {onSend && (
        // TODO(dmaretskyi): Set processing state correctly on rehydrated agents.
        <IconButton
          disabled={!processing && !canSend}
          variant='ghost'
          classNames={mx(TOUCH_TARGET, processing ? 'text-error-text' : canSend && 'text-accent-text')}
          icon={processing ? 'ph--square--duotone' : 'ph--paper-plane-right--regular'}
          iconOnly
          label={t(processing ? 'cancel-processing.button' : 'send.label')}
          // One stable handle for the prompt's primary action; its mode is the accessible label,
          // which is also how a reader tells the two apart.
          data-testid='assistant.send'
          onClick={() => (processing ? onEvent?.({ type: 'cancel' }) : onSend())}
        />
      )}
    </div>
  );
};
