//
// Copyright 2022 DXOS.org
//

import { Gift } from '@phosphor-icons/react';
import React from 'react';

import { useTranslation, Button, useTranslationsContext, Toast } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

export interface NeedRefreshToastProps {
  variant: 'needRefresh';
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

export interface OfflineReadyToastProps {
  variant: 'offlineReady';
}

export type ServiceWorkerToastProps = NeedRefreshToastProps | OfflineReadyToastProps;

const isNeedRefreshToast = (props: any): props is NeedRefreshToastProps => props.variant === 'needRefresh';

export const ServiceWorkerToast = (props: ServiceWorkerToastProps) => {
  const { t } = useTranslation('appkit');
  const { appNs } = useTranslationsContext();
  const { variant } = props;
  const needRefresh = isNeedRefreshToast(props);
  return (
    <Toast.Root defaultOpen {...(needRefresh && { duration: 240e3 })}>
      <Toast.Body>
        <Toast.Title>
          {variant === 'needRefresh' ? (
            <>
              <Gift className={mx(getSize(5), 'inline mr-1')} weight='duotone' />
              <span>{t('need refresh label')}</span>
            </>
          ) : (
            t('offline ready label', { appName: t('current app name', { ns: appNs }) })
          )}
        </Toast.Title>
        {variant === 'needRefresh' && <Toast.Description>{t('need refresh description')}</Toast.Description>}
      </Toast.Body>
      <Toast.Actions>
        {needRefresh && (
          <Toast.Action altText={t('refresh alt')} asChild>
            <Button variant='primary' onClick={() => props.updateServiceWorker()}>
              {t('refresh label')}
            </Button>
          </Toast.Action>
        )}
        {variant === 'offlineReady' && (
          <Toast.Close asChild>
            <Button>{t('confirm label', { ns: 'appkit' })}</Button>
          </Toast.Close>
        )}
      </Toast.Actions>
    </Toast.Root>
  );
};
