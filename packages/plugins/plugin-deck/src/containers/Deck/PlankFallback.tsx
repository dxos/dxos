//
// Copyright 2026 DXOS.org
//

import React, { useEffect } from 'react';

import { log } from '@dxos/log';
import * as ErrorFallback from '@dxos/react-ui/ErrorFallback';
import * as Flex from '@dxos/react-ui/Flex';
import * as Hooks from '@dxos/react-ui/Hooks';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '#meta';

/** User-facing error fallback for a plank's content Surface. */
export const PlankErrorFallback = ({ error }: ErrorFallback.ErrorFallbackProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  useEffect(() => {
    if (error) {
      log.error('plank error', { error });
    }
  }, [error]);

  if (process.env.NODE_ENV === 'development') {
    return <ErrorFallback.ErrorFallback title='Plank Error' error={error} />;
  }

  // Show only a generic message to end users; raw error details stay in logs / the dev fallback above.
  return (
    <Flex.Flex
      center
      role='alert'
      data-testid='plank-content-error'
      classNames='dx-attention-surface overflow-y-auto p-8'
    >
      <Flex.Flex column gap='sm' align='center'>
        <p className={mx(descriptionMessage, 'break-all rounded-md p-4')}>{t('error-fallback.message')}</p>
      </Flex.Flex>
    </Flex.Flex>
  );
};

PlankErrorFallback.displayName = 'PlankErrorFallback';
