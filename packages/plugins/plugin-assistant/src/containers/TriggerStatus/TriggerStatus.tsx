//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { type InvocationsState } from '@dxos/compute-runtime';
import { useTriggerRuntimeControls } from '@dxos/plugin-routine/hooks';
import { StatusBar } from '@dxos/plugin-status-bar/components';
import { Button, Container, Flex, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

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

export type SpaceStatusProps = AppSurface.SpaceArticleProps;

export const SpaceStatus = ({ space }: SpaceStatusProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { state } = useTriggerRuntimeControls(space.db);
  // The dispatcher is stopped for the space when `triggersDisabled` is set, so `enabled` already
  // reflects the space-wide kill-switch; per-trigger edge routing does not affect this indicator.
  const isEnabled = state?.enabled ?? false;

  // Determine the current trigger status state.
  const triggerState: TriggerStatusState = useMemo(() => {
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
    <Popover.Root positioning={{ placement: 'left' }}>
      <Popover.Trigger asChild>
        <StatusBar.Item>
          <Button
            variant='ghost'
            icon={getIcon(triggerState)}
            iconOnly
            label={t(`trigger-status-${triggerState}.label`)}
            classNames={getIconClassNames(triggerState)}
          />
        </StatusBar.Item>
      </Popover.Trigger>
      <Popover.Content>
        <TriggerStatusPopover
          state={triggerState}
          currentFunctionName={
            state?.invocations.at(-1)?.function?.meta.name ?? state?.invocations.at(-1)?.function?.meta.key
          }
          lastInvocation={state?.invocations.at(-1)}
        />
      </Popover.Content>
    </Popover.Root>
  );
};

type TriggerStatusPopoverProps = {
  state: TriggerStatusState;
  currentFunctionName?: string;
  lastInvocation?: InvocationsState;
};

const TriggerStatusPopover = ({
  state,
  currentFunctionName,
  lastInvocation, // TODO(burdon): Show.
}: TriggerStatusPopoverProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Flex column gap='sm' classNames='p-2 w-[240px]'>
      <Container gap='sm' gutter='none'>
        <div className='text-sm'>{t(`trigger-status-${state}.label`)}</div>
        {currentFunctionName && state === 'running' && (
          <div className='text-xs text-description'>{currentFunctionName}</div>
        )}
      </Container>
    </Flex>
  );
};

SpaceStatus.displayName = 'SpaceStatus';

TriggerStatusPopover.displayName = 'TriggerStatusPopover';
