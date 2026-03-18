//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type Database, Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Button, useTranslation } from '@dxos/react-ui';
import { AccessToken } from '@dxos/types';

import { getPresetBySource, useOAuth } from '../../hooks';
import { meta } from '../../meta';

export type IntegrationAuthButtonProps = {
  source: string;
  db: Database.Database;
};

/** Renders an OAuth connect button for the preset matching the given source. */
export const IntegrationAuthButton = ({ source, db }: IntegrationAuthButtonProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const handleAddAccessToken = useCallback(
    async (token: AccessToken.AccessToken) => {
      await invokePromise(SpaceOperation.AddObject, {
        object: token,
        target: db,
        hidden: true,
      });
    },
    [db, invokePromise],
  );

  const { startOAuthFlow } = useOAuth({ spaceId: db.spaceId, onAddAccessToken: handleAddAccessToken });
  const preset = getPresetBySource(source);

  const handleClick = useCallback(async () => {
    if (preset) {
      await startOAuthFlow(preset);
    }
  }, [startOAuthFlow, preset]);

  if (!preset) {
    return null;
  }

  return <Button onClick={handleClick}>{t('connect integration label', { provider: preset.label })}</Button>;
};
