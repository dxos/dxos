//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Icon, ListItem, IconButton, useTranslation, DropdownMenu } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { useIntegrations } from '../hooks';
import { INTEGRATION_PLUGIN } from '../meta';
import { type IntegrationType } from '../types';

// TODO(wittjosiah): Copied from PluginItem in plugin-registry. Reconcile.

export type IntegrationItemProps = {
  integration: IntegrationType;
  onRemove?: (integration: IntegrationType) => void;
};

export const IntegrationItem = ({ integration, onRemove }: IntegrationItemProps) => {
  const { t } = useTranslation(INTEGRATION_PLUGIN);
  const definitions = useIntegrations();
  const definition = definitions.find((d) => d.serviceId === integration.serviceId);
  const { id, name, icon = 'ph--circle--regular' } = definition ?? {};
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const handleRemove = useCallback(() => onRemove?.(integration), [integration, onRemove]);

  return (
    <ListItem.Root
      key={id}
      labelId={labelId}
      data-testid={`pluginList.${id}`}
      aria-describedby={descriptionId}
      // TODO(burdon): Use Rail vars.
      classNames='w-full h-full grid grid-cols-[48px_1fr_48px] grid-rows-[40px_1fr_32px] p-1 border border-separator rounded-md'
    >
      {/* Header. */}
      <div className='flex justify-center items-center'>
        <Icon icon={icon} size={6} classNames='text-subdued' />
      </div>
      <div className='flex items-center overflow-hidden'>
        <span className='truncate'>{name ?? id}</span>
      </div>
      <div className='flex justify-center items-center'>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton iconOnly icon='ph--trash--regular' label={t('remove integration label')} />
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content side='top'>
              <DropdownMenu.Viewport>
                <DropdownMenu.Item data-testid='resetDialog.confirmReset' onClick={handleRemove}>
                  {t('confirm remove integration label')}
                </DropdownMenu.Item>
              </DropdownMenu.Viewport>
              <DropdownMenu.Arrow />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Body. */}
      <div />
      <div id={descriptionId} className='col-span-2 pb-3'>
        <p className={mx(descriptionText, 'line-clamp-3 min-w-0 pie-4')}>{integration.accessToken?.target?.note}</p>
      </div>
    </ListItem.Root>
  );
};
