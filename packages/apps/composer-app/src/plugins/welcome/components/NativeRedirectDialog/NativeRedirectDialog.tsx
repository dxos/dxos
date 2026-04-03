//
// Copyright 2025 DXOS.org
//

import React, { useEffect } from 'react';

import { APP_SCHEME } from '@dxos/app-toolkit';
import { Button, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export const NATIVE_REDIRECT_DIALOG = `${meta.id}.component.native-redirect-dialog`;

export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void }) => {
  const { t } = useTranslation(meta.id);

  useEffect(() => {
    // Attempt to open the native app via custom URL scheme.
    // Use an iframe instead of window.location.href to avoid errors on invalid URLs
    // (e.g., paths containing colons like !dxos:settings/...).
    const schemeUrl = APP_SCHEME + window.location.pathname.replace(/^\/+/, '') + window.location.search;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = schemeUrl;
    document.body.appendChild(iframe);
    const timer = setTimeout(() => iframe.remove(), 3000);
    return () => {
      clearTimeout(timer);
      iframe.remove();
    };
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
