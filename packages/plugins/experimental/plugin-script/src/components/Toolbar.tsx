//
// Copyright 2024 DXOS.org
//

import { Checks, CircleNotch, Info, Link, MagicWand, UploadSimple, WarningCircle } from '@phosphor-icons/react';
import React, { useState } from 'react';

import {
  DensityProvider,
  ElevationProvider,
  type ThemedClassName,
  Toolbar as NaturalToolbar,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { SCRIPT_PLUGIN } from '../meta';

export type ToolbarProps = ThemedClassName<{
  onFormat?: () => Promise<void>;
  deployed?: boolean;
  onDeploy?: () => Promise<void>;
  onToggleInfo?: () => Promise<void>;
  functionUrl?: string;
  error?: string;
}>;

export const Toolbar = ({
  classNames,
  deployed,
  error,
  functionUrl,
  onDeploy,
  onFormat,
  onToggleInfo,
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
        <NaturalToolbar.Root classNames={['p-2', classNames]} style={{ contain: 'layout' }}>
          {onToggleInfo && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <NaturalToolbar.Button variant='ghost' onClick={onToggleInfo}>
                  <Info className={getSize(4)} />
                </NaturalToolbar.Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content>
                  <Tooltip.Arrow />
                  {t('run label')}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}

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
        </NaturalToolbar.Root>
      </ElevationProvider>
    </DensityProvider>
  );
};
