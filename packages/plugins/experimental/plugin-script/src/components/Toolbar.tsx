//
// Copyright 2024 DXOS.org
//

import { Checks, CircleNotch, Link, MagicWand, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import React, { useState } from 'react';

import {
  DensityProvider,
  ElevationProvider,
  Icon,
  type ThemedClassName,
  Toolbar as NaturalToolbar,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { SCRIPT_PLUGIN } from '../meta';

export type ToolbarProps = ThemedClassName<{
  deployed?: boolean;
  error?: string;
  functionUrl?: string;
  showPanel?: boolean;
  onDeploy?: () => Promise<void>;
  onFormat?: () => Promise<void>;
  onTogglePanel?: () => Promise<void>;
}>;

export const Toolbar = ({
  classNames,
  deployed,
  error,
  functionUrl,
  showPanel,
  onDeploy,
  onFormat,
  onTogglePanel,
}: ToolbarProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const [pending, setPending] = useState(false);

  const handleCopyLink = async () => {
    if (!functionUrl) {
      return;
    }

    await navigator.clipboard.writeText(functionUrl);
  };

  const handleDeploy = async () => {
    setPending(true);
    await onDeploy?.();
    setPending(false);
  };

  // TODO(burdon): Factor out common toolbar components with sheet/editor?
  return (
    <DensityProvider density='fine'>
      <ElevationProvider elevation='chrome'>
        <NaturalToolbar.Root classNames={['p-1', classNames]} style={{ contain: 'layout' }}>
          {onFormat && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <NaturalToolbar.Button variant='ghost' onClick={onFormat}>
                  <MagicWand className={getSize(4)} />
                </NaturalToolbar.Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {t('format label')}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}

          <div role='separator' className='grow' />

          {functionUrl && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <NaturalToolbar.Button variant='ghost' onClick={handleCopyLink}>
                  <Link className={getSize(4)} />
                </NaturalToolbar.Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {t('copy link label')}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}

          {/* TODO(wittjosiah): Better treatment for status indicators in toolbar? */}
          {error ? (
            <Tooltip.Root>
              <Tooltip.Trigger>
                <WarningCircle className={getSize(4)} />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {error}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : deployed ? (
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Checks className={getSize(4)} />
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {t('deployed label')}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : null}

          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <NaturalToolbar.Button variant='ghost' onClick={handleDeploy} disabled={pending}>
                {pending ? (
                  <CircleNotch className={mx('spinner', getSize(4))} />
                ) : (
                  <UploadSimple className={getSize(4)} />
                )}
              </NaturalToolbar.Button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content>
                <Tooltip.Arrow />
                {pending ? t('pending label') : t('deploy label')}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          {onTogglePanel && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <NaturalToolbar.Button variant='ghost' onClick={onTogglePanel}>
                  <Icon icon={showPanel ? 'ph--caret-up--regular' : 'ph--caret-down--regular'} size={4} />
                </NaturalToolbar.Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {t('toggle details label')}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
        </NaturalToolbar.Root>
      </ElevationProvider>
    </DensityProvider>
  );
};
