//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { type InvocationsState } from '@dxos/functions-runtime';
import { useTriggerRuntimeControls } from '@dxos/plugin-automation/hooks';
import { StatusBar } from '@dxos/plugin-status-bar';
import { useObject, type Database, type Space } from '@dxos/react-client/echo';
import { IconButton, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

type TriggerStatusState = 'disabled' | 'idle' | 'running' | 'edge' | 'error';

const getIcon = (state: TriggerStatusState): string => {
  switch (state) {
    case 'disabled':
      return 'ph--lightning-slash--regular';
    case 'idle':
      return 'ph--lightning--regular';
    case 'edge':
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
  if (!space) {
    return null;
  }

  return <SpaceStatusMain space={space} />;
};

const SpaceStatusMain = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  const { state, start, stop } = useTriggerRuntimeControls(space.db);
  const isEnabled = state?.enabled ?? false;
  const [properties, changeProperties] = useObject(space.properties);
  const computeEnvironment = properties.computeEnvironment ?? 'local';

  // Determine the current trigger status state.
  const triggerState: TriggerStatusState = useMemo(() => {
    if (computeEnvironment === 'edge') {
      return 'edge';
    }

    if (!isEnabled) {
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
  }, [isEnabled, state?.invocations]);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <IconButton
            icon={getIcon(triggerState)}
            iconOnly
            label={t(`trigger-status-${triggerState}.label`)}
            classNames={getIconClassNames(triggerState)}
          />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='left'>
          <TriggerStatusPopover
            isRunning={isEnabled}
            state={triggerState}
            currentFunctionName={
              state?.invocations.at(-1)?.function?.meta.name ?? state?.invocations.at(-1)?.function?.meta.key
            }
            lastInvocation={state?.invocations.at(-1)}
            onToggle={isEnabled ? stop : start}
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
      <div className='flex flex-col gap-1'>
        <div className='text-sm'>{t(`trigger-status-${state}.label`)}</div>
        {currentFunctionName && state === 'running' && (
          <div className='text-xs text-description'>{currentFunctionName}</div>
        )}
      </div>
    </div>
  );
};

export default TriggerStatus;
