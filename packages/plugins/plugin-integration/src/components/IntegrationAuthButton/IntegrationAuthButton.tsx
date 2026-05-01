//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { type Database } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { Button, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { IntegrationProvider } from '#types';

import { IntegrationCoordinator } from '../../capabilities';

export type IntegrationAuthButtonProps = {
  /** Stable id of the `IntegrationProvider` capability entry to authenticate against. */
  providerId: string;
  db: Database.Database;
};

/**
 * Inline OAuth connect button. Hands off to the long-lived
 * {@link IntegrationCoordinator}, which builds the AccessToken + Integration
 * stubs in memory, runs OAuth, and persists everything on success — same
 * flow as the standard "Add Object → Integration" dialog. Used by callers
 * (e.g. inbox / calendar) that detect a missing integration mid-flow.
 */
export const IntegrationAuthButton = ({ providerId, db }: IntegrationAuthButtonProps) => {
  const { t } = useTranslation(meta.id);
  const manager = usePluginManager();
  const provider = manager.capabilities
    .getAll(IntegrationProvider)
    .flat()
    .find((p) => p.id === providerId);

  const handleClick = useCallback(async () => {
    const coordinator = manager.capabilities.get(IntegrationCoordinator);
    await runAndForwardErrors(coordinator.createIntegration({ db, spaceId: db.spaceId, providerId })).catch(() => {});
  }, [manager, db, providerId]);

  if (!provider?.oauth) {
    return null;
  }

  return (
    <Button onClick={handleClick}>{t('connect-integration.label', { provider: provider.label ?? provider.id })}</Button>
  );
};
