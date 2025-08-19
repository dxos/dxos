//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';
import { type ChatEvent } from '../Chat';

export type ChatActionsProps = ThemedClassName<
  PropsWithChildren<{
    microphone?: boolean;
    recording?: boolean;
    processing?: boolean;
    onEvent?: (event: ChatEvent) => void;
  }>
>;

export const ChatActions = ({ classNames, children, microphone, recording, processing, onEvent }: ChatActionsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <div className={mx('flex items-center mie-1', classNames)}>
      {children}

      {(processing && (
        <IconButton
          disabled={!processing}
          classNames='px-1.5'
          variant='ghost'
          size={5}
          icon='ph--x--regular'
          iconOnly
          label={t('button cancel processing')}
          onClick={() => onEvent?.({ type: 'cancel' })}
        />
      )) || (
        <IconButton
          variant='ghost'
          icon='ph--arrow-down--regular'
          iconOnly
          label={t('button scroll down')}
          onClick={() => onEvent?.({ type: 'scroll-to-bottom' })}
        />
      )}

      {microphone && (
        <IconButton
          disabled={!processing}
          classNames={mx('px-1.5', recording && 'bg-primary-500')}
          variant='ghost'
          size={5}
          icon='ph--microphone--regular'
          iconOnly
          noTooltip
          label={t('button microphone')}
          onMouseDown={() => onEvent?.({ type: 'record-start' })}
          onMouseUp={() => onEvent?.({ type: 'record-stop' })}
          onTouchStart={() => onEvent?.({ type: 'record-start' })}
          onTouchEnd={() => onEvent?.({ type: 'record-stop' })}
        />
      )}
    </div>
  );
};
