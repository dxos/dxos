//
// Copyright 2026 DXOS.org
//

import React, { useEffect } from 'react';

import { log } from '@dxos/log';
import { ErrorFallback, type ErrorFallbackProps, Flex, useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '#meta';

// TODO(burdon): Show skeleton: https://github.com/dxos/dxos/issues/8259
export const PlankLoading = () => <Flex center classNames='dx-attention-surface' />;

/** User-facing error fallback for a plank's content Surface. */
export const PlankErrorFallback = ({ error }: ErrorFallbackProps) => {
  const { t } = useTranslation(meta.profile.key);

  useEffect(() => {
    if (error) {
      log.error('plank error', { error });
    }
  }, [error]);

  if (process.env.NODE_ENV === 'development') {
    return <ErrorFallback title='Plank Error' error={error} />;
  }

  // Show only a generic message to end users; raw error details stay in logs / the dev fallback above.
  return (
    <Flex center role='alert' data-testid='plank-content-error' classNames='dx-attention-surface overflow-y-auto p-8'>
      <Flex column gap='sm' align='center'>
        <p className={mx(descriptionMessage, 'break-all rounded-md p-4')}>{t('error-fallback.message')}</p>
      </Flex>
    </Flex>
  );
};

PlankLoading.displayName = 'PlankLoading';

PlankErrorFallback.displayName = 'PlankErrorFallback';
