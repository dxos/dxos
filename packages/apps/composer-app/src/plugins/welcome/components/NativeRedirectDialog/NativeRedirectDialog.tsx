//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Button, useTranslation } from '@dxos/react-ui';

import { DXN } from '@dxos/keys';

import { meta } from '../../meta';

export const NATIVE_REDIRECT_DIALOG = DXN.make(`${DXN.getName(meta.id)}.componentNativeRedirectDialog`);

/**
 * Shown after the native app has been successfully opened via custom scheme.
 * Gives the user the option to stay in the browser instead.
 */
export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void }) => {
  const { t } = useTranslation(meta.id);

  return (
    <div className='flex flex-col items-center justify-center h-full gap-8'>
      <h1 className="font-['Poiret One'] text-5xl" style={{ fontFamily: 'Poiret One' }}>
        composer
      </h1>
      <p className='text-lg text-subdued'>{t('native-redirect.message')}</p>
      <Button variant='ghost' onClick={onOpenHere}>
        {t('open-in-browser-button.label')}
      </Button>
    </div>
  );
};
