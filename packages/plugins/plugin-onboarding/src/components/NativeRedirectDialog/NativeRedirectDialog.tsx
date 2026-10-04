//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '../../meta.ts';

/**
 * Shown after the native app has been successfully opened via custom scheme.
 * Gives the user the option to stay in the browser instead.
 */
export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  return (
    <div className='flex flex-col items-center justify-center h-full gap-8'>
      <h1 className="font-['Poiret One'] text-5xl" style={{ fontFamily: 'Poiret One' }}>
        composer
      </h1>
      <p className='text-lg text-fg-subtle'>{t('native-redirect.message')}</p>
      <Button.Root variant='ghost' onClick={onOpenHere}>
        {t('open-in-browser-button.label')}
      </Button.Root>
    </div>
  );
};
