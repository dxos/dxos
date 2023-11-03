//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';

import { parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
import { useTranslation } from '@dxos/react-ui';
import { baseSurface, descriptionText, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN, SpaceAction } from '../types';

export const MissingObject = ({ id }: { id: string }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  useEffect(() => {
    if (!intentPlugin) {
      return;
    }

    void intentPlugin.provides.intent.dispatch({
      plugin: SPACE_PLUGIN,
      action: SpaceAction.WAIT_FOR_OBJECT,
      data: { id },
    });
  }, [intentPlugin, id]);

  return (
    <div role='none' className={mx(baseSurface, 'min-bs-screen is-full flex items-center justify-center p-8')}>
      <p
        role='alert'
        className={mx(
          descriptionText,
          'border border-dashed border-neutral-400/50 rounded-xl flex items-center justify-center p-8 font-system-normal text-lg',
        )}
      >
        {t('missing object message')}
        {/* t('missing object description') */}
      </p>
    </div>
  );
};
