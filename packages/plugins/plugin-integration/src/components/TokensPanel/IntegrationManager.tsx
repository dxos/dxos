//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { IconButton, List, ListItem, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { type Integration } from '../../types';

export type IntegrationManagerProps = {
  integrations: Integration.Integration[];
  onDelete?: (integration: Integration.Integration) => void;
};

/**
 * Lists configured Integrations as the primary section of the integrations panel.
 * Each row shows the integration's source/account header, optional name, target count,
 * and a delete affordance. Click-through to the Integration article surface is wired
 * via the parent (graph navigation), not the row itself.
 */
export const IntegrationManager = ({ integrations, onDelete }: IntegrationManagerProps) => {
  if (!integrations.length) {
    return null;
  }
  return (
    <List>
      {integrations.map((integration) => (
        <IntegrationListItem
          key={Obj.getDXN(integration).toString()}
          integration={integration}
          onDelete={onDelete}
        />
      ))}
    </List>
  );
};

type IntegrationListItemProps = {
  integration: Integration.Integration;
  onDelete?: (integration: Integration.Integration) => void;
};

const IntegrationListItem = ({ integration, onDelete }: IntegrationListItemProps) => {
  const { t } = useTranslation(meta.id);
  const accessToken = integration.accessToken.target;
  const targetCount = integration.targets?.length ?? 0;

  const handleDelete = useCallback(() => {
    onDelete?.(integration);
  }, [integration, onDelete]);

  return (
    <ListItem.Root classNames='grid grid-cols-[1fr_min-content]'>
      <div className='flex flex-col'>
        <ListItem.Heading>
          {integration.name ?? accessToken?.account ?? accessToken?.source ?? '(unnamed)'}
        </ListItem.Heading>
        {accessToken && (
          <p className='text-description'>
            {accessToken.source}
            {accessToken.account ? ` · ${accessToken.account}` : ''}
          </p>
        )}
        <p className='text-description'>
          {t('target count.label', { defaultValue: '{{count}} targets', count: targetCount })}
        </p>
      </div>
      <ListItem.Endcap>
        <IconButton
          iconOnly
          icon='ph--x--regular'
          variant='ghost'
          label={t('delete-integration.menu', { defaultValue: 'Delete integration' })}
          onClick={handleDelete}
        />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};
