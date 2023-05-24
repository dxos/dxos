//
// Copyright 2022 DXOS.org
//

import { Gift } from '@phosphor-icons/react';
import React from 'react';

import {
  useTranslation,
  Button,
  useTranslationsContext,
  ToastRoot,
  ToastTitle,
  ToastDescription,
  ToastBody,
  ToastActions,
  ToastClose,
  ToastAction,
} from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

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
    <ToastRoot defaultOpen {...(needRefresh && { duration: 240e3 })}>
      <ToastBody>
        <ToastTitle>
          {variant === 'needRefresh' ? (
            <>
              <Gift className={mx(getSize(5), 'inline mr-1')} weight='duotone' />
              <span>{t('need refresh label')}</span>
            </>
          ) : (
            t('offline ready label', { appName: t('current app name', { ns: appNs }) })
          )}
        </ToastTitle>
        <ToastDescription>{t('need refresh description')}</ToastDescription>
      </ToastBody>
      <ToastActions>
        {needRefresh && (
          <ToastAction altText={t('refresh alt')} asChild>
            <Button variant='primary' onClick={() => props.updateServiceWorker()}>
              {t('refresh label')}
            </Button>
          </ToastAction>
        )}
        {variant === 'offlineReady' && (
          <ToastClose asChild>
            <Button>{t('confirm label', { ns: 'appkit' })}</Button>
          </ToastClose>
        )}
      </ToastActions>
    </ToastRoot>
  );
};
