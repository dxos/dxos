//
// Copyright 2022 DXOS.org
//

import { Gift } from 'phosphor-react';
import React from 'react';

import { useTranslation, Toast, Button, getSize, mx, useTranslationsContext } from '@dxos/react-components';

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
  return (
    <Toast
      initiallyOpen
      title={
        variant === 'needRefresh' ? (
          <>
            <Gift className={mx(getSize(5), 'inline mr-1')} weight='duotone' />
            <span>{t('need refresh label')}</span>
          </>
        ) : (
          t('offline ready label', { appName: t('current app name', { ns: appNs }) })
        )
      }
      {...(isNeedRefreshToast(props) && {
        slots: { root: { duration: 240e3 } },
        description: t('need refresh description'),
        actionTriggers: [
          {
            altText: t('refresh alt'),
            trigger: (
              <Button variant='primary' onClick={() => props.updateServiceWorker()}>
                {t('refresh label')}
              </Button>
            )
          }
        ]
      })}
      {...(variant === 'offlineReady' && {
        closeTrigger: <Button>{t('confirm label', { ns: 'appkit' })}</Button>
      })}
    />
  );
};
