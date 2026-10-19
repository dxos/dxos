//
// Copyright 2026 DXOS.org
//

import React, { useEffect } from 'react';

import { log } from '@dxos/log';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Status from '@dxos/react-ui/Status';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '#meta';

/** User-facing error fallback for a plank's content Surface. */
export const PlankErrorFallback = ({ error }: Status.ErrorProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  useEffect(() => {
    if (error) {
      log.error('plank error', { error });
    }
  }, [error]);

  if (process.env.NODE_ENV === 'development') {
    return <Status.Error title='Plank Error' error={error} />;
  }

  // Show only a generic message to end users; raw error details stay in logs / the dev fallback above.
  return (
    <Layout.Flex
      center
      role='alert'
      data-testid='plank-content-error'
      classNames='dx-attention-surface overflow-y-auto p-8'
    >
      <Layout.Flex column gap='sm' align='center'>
        <p className={mx(descriptionMessage, 'break-all rounded-md p-4')}>{t('error-fallback.message')}</p>
      </Layout.Flex>
    </Layout.Flex>
  );
};

PlankErrorFallback.displayName = 'PlankErrorFallback';
