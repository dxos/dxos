//
// Copyright 2025 DXOS.org
//

import React, { useEffect } from 'react';

import { Button, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

const APP_SCHEME = 'composer://';

export const NATIVE_REDIRECT_DIALOG = `${meta.id}.component.native-redirect-dialog`;

export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void }) => {
  const { t } = useTranslation(meta.id);

  useEffect(() => {
    // Attempt to open the native app via custom URL scheme.
    const schemeUrl = APP_SCHEME + window.location.pathname.replace(/^\/+/, '') + window.location.search;
    window.location.href = schemeUrl;
  }, []);

  return (
    <div className='flex flex-col items-center justify-center h-full gap-8'>
      <h1 className="font-['Poiret One'] text-5xl" style={{ fontFamily: 'Poiret One' }}>
        composer
      </h1>
      <p className='text-lg text-subdued'>{t('native redirect message')}</p>
      <Button variant='ghost' onClick={onOpenHere}>
        {t('open in browser button label')}
      </Button>
    </div>
  );
};
