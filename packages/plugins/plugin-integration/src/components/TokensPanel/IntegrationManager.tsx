//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { IconButton, List, ListItem, useTranslation } from '@dxos/react-ui';

import { useSyncIntegration, useSyncTargetsChecklist } from '#hooks';
import { meta } from '#meta';

import { type Integration } from '../../types';

export type IntegrationManagerProps = {
  integrations: Integration.Integration[];
  onDelete?: (integration: Integration.Integration) => void;
};

/**
 * Lists configured Integrations as the primary section of the integrations panel.
 * Each row is its own component so it can subscribe to its underlying AccessToken
 * via `useObject`, picking up reactive changes to fields like `account` (which
 * the matching IntegrationProvider's `onTokenCreated` hook fills in async after
 * OAuth completes).
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
  // Subscribe to the underlying AccessToken so reactive fields (`account` filled
  // in async by the provider's `onTokenCreated` hook) re-render this row.
  const [accessToken] = useObject(integration.accessToken);
  const editTargets = useSyncTargetsChecklist(integration);
  const sync = useSyncIntegration(integration);

  const handleDelete = useCallback(() => {
    onDelete?.(integration);
  }, [integration, onDelete]);

  // Heading from the Integration's LabelAnnotation (`name`, defaulted to the
  // service label on creation). Sub-line from the AccessToken's LabelAnnotation
  // (`account` → `note` → `source`); `note` is set to the service label by the
  // OAuth flow so this falls back gracefully before `account` populates.
  const heading = Obj.getLabel(integration);
  const subline = accessToken ? Obj.getLabel(accessToken) : undefined;

  // Show sync only when the provider supports it AND there's something configured
  // to sync — syncing zero targets is a no-op and the affordance would be confusing.
  const showSync = sync.available && (integration.targets?.length ?? 0) > 0;

  return (
    <ListItem.Root classNames='grid grid-cols-[1fr_min-content_min-content_min-content]'>
      <div className='flex flex-col'>
        <ListItem.Heading>{heading}</ListItem.Heading>
        {subline && <p className='text-description'>{subline}</p>}
      </div>
      {showSync && (
        <ListItem.Endcap>
          <IconButton
            iconOnly
            icon='ph--arrows-clockwise--regular'
            variant='ghost'
            label={t('sync-now.menu', { defaultValue: 'Sync now' })}
            onClick={sync.sync}
            disabled={sync.syncing}
          />
        </ListItem.Endcap>
      )}
      {editTargets.available && (
        <ListItem.Endcap>
          <IconButton
            iconOnly
            icon='ph--pencil--regular'
            variant='ghost'
            label={t('edit-targets.menu', { defaultValue: 'Edit sync targets' })}
            onClick={editTargets.openChecklist}
            disabled={editTargets.loading}
          />
        </ListItem.Endcap>
      )}
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
