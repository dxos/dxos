//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Icon, ListItem, Button, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { INTEGRATION_PLUGIN } from '../meta';
import { type IntegrationDefinition } from '../types';

// TODO(wittjosiah): Copied from PluginItem in plugin-registry. Reconcile.

export type IntegrationDefinitionItemProps = {
  integration: IntegrationDefinition;
  onConfigure?: (integration: IntegrationDefinition) => void;
};

export const IntegrationDefinitionItem = ({ integration, onConfigure }: IntegrationDefinitionItemProps) => {
  const { t } = useTranslation(INTEGRATION_PLUGIN);
  const { id, name, description, icon = 'ph--circle--regular' } = integration;
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const handleConfigure = useCallback(() => onConfigure?.(integration), [integration, onConfigure]);

  return (
    <ListItem.Root
      key={id}
      labelId={labelId}
      data-testid={`pluginList.${id}`}
      aria-describedby={descriptionId}
      // TODO(burdon): Use Rail vars.
      classNames='w-full h-full grid grid-cols-[48px_1fr_96px] grid-rows-[40px_1fr_32px] p-1 border border-separator rounded-md'
    >
      {/* Header. */}
      <div className='flex justify-center items-center'>
        <Icon icon={icon} size={6} classNames='text-subdued cursor-pointer' />
      </div>
      <div className='flex items-center overflow-hidden cursor-pointer'>
        <span className='truncate'>{name ?? id}</span>
      </div>
      <div className='flex justify-center items-center'>
        <Button disabled={!integration.auth} onClick={handleConfigure}>
          {t('configure integration label')}
        </Button>
      </div>

      {/* Body. */}
      <div />
      <div id={descriptionId} className='col-span-2 pb-3'>
        <p className={mx(descriptionText, 'line-clamp-3 min-w-0 pie-4')}>{description}</p>
      </div>
    </ListItem.Root>
  );
};
