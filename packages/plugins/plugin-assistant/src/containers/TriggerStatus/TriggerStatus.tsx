//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type InvocationsState } from '@dxos/functions-runtime';
import { useTriggerRuntimeControls } from '@dxos/plugin-automation';
import { useActiveSpace } from '@dxos/plugin-space';
import { StatusBar } from '@dxos/plugin-status-bar';
import { type Database } from '@dxos/react-client/echo';
import { IconButton, Input, Popover, useTranslation } from '@dxos/react-ui';

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
      return 'animate-pulse text-accent-text';
    case 'error':
      return 'text-error-text';
    default:
      return undefined;
  }
};

export const TriggerStatus = () => {
  const space = useActiveSpace();
  const db = space?.db;
  if (!db) {
    return null;
  }

  return <SpaceStatusMain db={db} />;
};

const SpaceStatusMain = ({ db }: { db: Database.Database }) => {
  const { t } = useTranslation(meta.id);
  const { state, start, stop } = useTriggerRuntimeControls(db);
  const isRunning = state?.enabled ?? false;

  // Determine the current trigger status state.
  const triggerState: TriggerStatusState = useMemo(() => {
    if (!isRunning) {
      return 'disabled';
    }

    // Check if there's any pending invocation.
    const hasPending = state?.invocations.some((invocation) => invocation.result === null);
    if (hasPending) {
      return 'running';
    }

    // Check if the last invocation failed.
    const lastInvocation = state?.invocations.at(-1);
    if (lastInvocation?.result?._tag === 'Failure') {
      return 'error';
    }

    return 'idle';
  }, [isRunning, state?.invocations]);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <IconButton
            icon={getIcon(triggerState)}
            iconOnly
            label={t(`trigger status ${triggerState} label`)}
            classNames={getIconClassNames(triggerState)}
          />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='left'>
          <TriggerStatusPopover
            isRunning={isRunning}
            state={triggerState}
            currentFunctionName={state?.invocations.at(-1)?.function?.name ?? state?.invocations.at(-1)?.function?.key}
            lastInvocation={state?.invocations.at(-1)}
            onToggle={isRunning ? stop : start}
          />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

type TriggerStatusPopoverProps = {
  isRunning: boolean;
  state: TriggerStatusState;
  currentFunctionName?: string;
  lastInvocation?: InvocationsState;
  onToggle: () => void;
};

const TriggerStatusPopover = ({
  isRunning,
  state,
  currentFunctionName,
  lastInvocation, // TODO(burdon): Show.
  onToggle,
}: TriggerStatusPopoverProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <div className='flex flex-col gap-2 p-2 w-[240px]'>
      <Input.Root>
        <div className='flex items-center gap-2'>
          <Input.Switch checked={isRunning} onCheckedChange={onToggle} />
          <Input.Label>{t('trigger runtime label')}</Input.Label>
        </div>
      </Input.Root>

      <div className='flex flex-col gap-1'>
        <div className='text-sm'>{t(`trigger status ${state} label`)}</div>
        {currentFunctionName && state === 'running' && (
          <div className='text-xs text-description'>{currentFunctionName}</div>
        )}
      </div>
    </div>
  );
};

export default TriggerStatus;
