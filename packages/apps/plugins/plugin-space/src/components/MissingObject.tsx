//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
import { Status, useTranslation } from '@dxos/react-ui';
import { baseSurface, descriptionText, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN } from '../meta';
import { SpaceAction } from '../types';

const WAIT_FOR_OBJECT_TIMEOUT = 1_000;

export const MissingObject = ({ id }: { id: string }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const [waiting, setWaiting] = useState(false);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  useEffect(() => {
    if (!intentPlugin) {
      return;
    }

    const timeout = setTimeout(async () => {
      setWaiting(true);
      await intentPlugin.provides.intent.dispatch({
        plugin: SPACE_PLUGIN,
        action: SpaceAction.WAIT_FOR_OBJECT,
        data: { id },
      });
    }, WAIT_FOR_OBJECT_TIMEOUT);

    return () => clearTimeout(timeout);
  }, [intentPlugin, id]);

  return (
    <div role='none' className={mx(baseSurface, 'min-bs-screen is-full flex items-center justify-center p-8')}>
      {waiting ? (
        <p
          role='alert'
          className={mx(
            descriptionText,
            'border border-dashed border-neutral-400/50 rounded-lg flex items-center justify-center p-8 font-normal text-lg',
          )}
        >
          {t('missing object message')}
        </p>
      ) : (
        <Status indeterminate aria-label='Initializing' />
      )}
    </div>
  );
};
