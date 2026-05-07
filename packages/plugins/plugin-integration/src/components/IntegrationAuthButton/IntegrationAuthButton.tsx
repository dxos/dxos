//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { usePluginManager } from '@dxos/app-framework/ui';
import { type Database, type Obj, type Ref } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { Button, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { IntegrationCoordinator, IntegrationProvider } from '#types';

export type IntegrationAuthButtonProps = {
  /** Stable id of the `IntegrationProvider` capability entry to authenticate against. */
  providerId: string;
  db: Database.Database;
  /**
   * Existing local object (e.g. an empty Mailbox or Calendar the user is
   * already viewing) to wire up as the new Integration's first target —
   * skips creating a fresh placeholder. Threaded through to the provider's
   * `onTokenCreated` and the sync-targets dialog.
   */
  existingTarget?: Ref.Ref<Obj.Unknown>;
};

/**
 * Inline OAuth connect button. Hands off to the long-lived
 * {@link IntegrationCoordinator}, which builds the AccessToken + Integration
 * stubs in memory, runs OAuth, and persists everything on success — same
 * flow as the standard "Add Object → Integration" dialog. Used by callers
 * (e.g. inbox / calendar) that detect a missing integration mid-flow.
 */
export const IntegrationAuthButton = ({ providerId, db, existingTarget }: IntegrationAuthButtonProps) => {
  const { t } = useTranslation(meta.id);
  const manager = usePluginManager();
  const provider = manager.capabilities
    .getAll(IntegrationProvider)
    .flat()
    .find((p) => p.id === providerId);

  const handleClick = useCallback(async () => {
    const coordinator = manager.capabilities.get(IntegrationCoordinator);
    await runAndForwardErrors(
      coordinator.createIntegration({ db, spaceId: db.spaceId, providerId, existingTarget }),
    ).catch(() => {});
  }, [manager, db, providerId, existingTarget]);

  if (!provider?.oauth) {
    return null;
  }

  return (
    <Button onClick={handleClick}>{t('connect-integration.label', { provider: provider.label ?? provider.id })}</Button>
  );
};
