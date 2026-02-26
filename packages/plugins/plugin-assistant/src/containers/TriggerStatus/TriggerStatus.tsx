//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { useLayout } from '@dxos/app-toolkit/ui';
import { type InvocationsState } from '@dxos/functions-runtime';
import { useTriggerRuntimeControls } from '@dxos/plugin-automation';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { StatusBar } from '@dxos/plugin-status-bar';
import { type Database, parseId } from '@dxos/react-client/echo';
import { Icon, Input, Popover, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
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
      return 'animate-pulse text-accent-text';
    case 'error':
      return 'text-error-text';
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
  if (!db) {
    return null;
  }

  return <SpaceStatusMain db={db} />;
};

const SpaceStatusMain = ({ db }: { db: Database.Database }) => {
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

  const { t } = useTranslation(meta.id);
  const title = t(`trigger status ${triggerState} label`);
  const icon = <Icon icon={getIcon(triggerState)} classNames={getIconClassNames(triggerState)} />;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <StatusBar.Item title={title}>{icon}</StatusBar.Item>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
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

interface TriggerStatusPopoverProps {
  isRunning: boolean;
  state: TriggerStatusState;
  currentFunctionName?: string;
  lastInvocation?: InvocationsState;
  onToggle: () => void;
}

const TriggerStatusPopover = ({
  isRunning,
  state,
  currentFunctionName,
  lastInvocation,
  onToggle,
}: TriggerStatusPopoverProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <div className='min-w-[240px] p-2 space-y-3'>
      {/* Runtime Toggle */}
      <Settings.ItemInput title={t('trigger runtime label')} description={t('trigger runtime description')}>
        <Input.Switch classNames='justify-self-end' checked={isRunning} onCheckedChange={onToggle} />
      </Settings.ItemInput>

      {/* Status Indicator */}
      <div className='flex items-center gap-2 pt-2 border-t border-separator'>
        <Icon icon={getIcon(state)} classNames={mx(getIconClassNames(state), 'shrink-0')} />
        <span className='text-sm'>{t(`trigger status ${state} label`)}</span>
        {currentFunctionName && state === 'running' && (
          <span className='text-xs text-description'>{currentFunctionName}</span>
        )}
      </div>
    </div>
  );
};

export default TriggerStatus;
