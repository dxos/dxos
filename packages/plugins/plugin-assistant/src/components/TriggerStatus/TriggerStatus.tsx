//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/react';
import { useLayout } from '@dxos/app-framework/react';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { useTriggerRuntimeControls } from '@dxos/plugin-automation';
import { StatusBar } from '@dxos/plugin-status-bar';
import { parseId } from '@dxos/react-client/echo';
import { useQueue } from '@dxos/react-client/echo';
import { Icon, Popover, Input, useTranslation } from '@dxos/react-ui';
import { ControlItemInput } from '@dxos/react-ui-form';
import {
  createInvocationSpans,
  InvocationOutcome,
  type InvocationSpan,
  type InvocationTraceEvent,
} from '@dxos/functions-runtime';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

type TriggerStatusState = 'disabled' | 'idle' | 'running' | 'error';

const getIcon = (state: TriggerStatusState): string => {
  switch (state) {
    case 'disabled':
      return 'ph--lightning-slash--regular';
    case 'idle':
      return 'ph--lightning--regular';
    case 'running':
      return 'ph--lightning--fill';
    case 'error':
      return 'ph--warning--regular';
  }
};

const getIconClassNames = (state: TriggerStatusState): string | undefined => {
  switch (state) {
    case 'running':
      return 'animate-pulse text-accentText';
    case 'error':
      return 'text-errorText';
    default:
      return undefined;
  }
};

const useCurrentSpace = () => {
  const layout = useLayout();
  const client = useCapability(ClientCapabilities.Client);
  const { spaceId } = parseId(layout.workspace);
  const space = spaceId ? client.spaces.get(spaceId) : undefined;
  return space;
};

export const TriggerStatus = () => {
  const space = useCurrentSpace();
  const db = space?.db;
  const { isRunning, start, stop } = useTriggerRuntimeControls(db);

  // Get invocation trace queue for the current space.
  const queueDxn = space?.properties.invocationTraceQueue?.dxn;
  const invocationsQueue = useQueue<InvocationTraceEvent>(queueDxn, {
    pollInterval: 1000,
  });

  // Convert trace events to invocation spans and determine state.
  const invocationSpans: InvocationSpan[] = useMemo(
    () => createInvocationSpans(invocationsQueue?.objects),
    [invocationsQueue?.objects],
  );

  // Get the most recent invocation span.
  const lastSpan = invocationSpans.at(-1);

  // Determine the current trigger status state.
  const state: TriggerStatusState = useMemo(() => {
    if (!isRunning) {
      return 'disabled';
    }

    // Check if there's any pending invocation.
    const hasPending = invocationSpans.some((span) => span.outcome === InvocationOutcome.PENDING);
    if (hasPending) {
      return 'running';
    }

    // Check if the last invocation failed.
    if (lastSpan?.outcome === InvocationOutcome.FAILURE) {
      return 'error';
    }

    return 'idle';
  }, [isRunning, invocationSpans, lastSpan]);

  const { t } = useTranslation(meta.id);
  const title = t(`trigger status ${state} label`);
  const icon = <Icon icon={getIcon(state)} classNames={getIconClassNames(state)} />;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item title={title}>{icon}</StatusBar.Item>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <TriggerStatusPopover
            isRunning={isRunning}
            state={state}
            lastSpan={lastSpan}
            onToggle={isRunning ? stop : start}
          />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

interface TriggerStatusPopoverProps {
  isRunning: boolean;
  state: TriggerStatusState;
  lastSpan?: {
    outcome: InvocationOutcome;
    timestamp: number;
    duration: number;
    error?: { message?: string };
  };
  onToggle: () => void;
}

const TriggerStatusPopover = ({ isRunning, state, lastSpan, onToggle }: TriggerStatusPopoverProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <div className='min-is-[240px] p-2 space-y-3'>
      {/* Runtime Toggle */}
      <ControlItemInput
        title={t('trigger runtime label')}
        description={t('trigger runtime description')}
      >
        <Input.Switch
          classNames='justify-self-end'
          checked={isRunning}
          onCheckedChange={onToggle}
        />
      </ControlItemInput>

      {/* Status Indicator */}
      <div className='flex items-center gap-2 pt-2 border-t border-separator'>
        <Icon
          icon={getIcon(state)}
          classNames={mx(getIconClassNames(state), 'shrink-0')}
        />
        <span className='text-sm'>{t(`trigger status ${state} label`)}</span>
      </div>

      {/* Last Invocation Details */}
      {lastSpan && (
        <div className='space-y-2 text-sm text-description'>
          <div className='flex items-center justify-between'>
            <span>{t('trigger last invocation label')}</span>
            <span className='font-mono text-xs'>
              {new Date(lastSpan.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span>{t('trigger duration label')}</span>
            <span className='font-mono text-xs'>
              {lastSpan.duration < 1000
                ? `${lastSpan.duration}ms`
                : `${(lastSpan.duration / 1000).toFixed(1)}s`}
            </span>
          </div>
          {lastSpan.outcome === InvocationOutcome.FAILURE && lastSpan.error?.message && (
            <div className='p-2 bg-errorContainer text-errorText rounded text-xs'>
              {lastSpan.error.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TriggerStatus;
