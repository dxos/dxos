//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { Gift } from 'phosphor-react';
import React from 'react';

import { useTranslation, Toast, Button, getSize } from '@dxos/react-uikit';

interface NeedRefreshToastProps {
  variant: 'needRefresh';
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

interface OfflineReadyToastProps {
  variant: 'offlineReady';
}

export type ServiceWorkerToastProps = NeedRefreshToastProps | OfflineReadyToastProps;

const isNeedRefreshToast = (o: any): o is NeedRefreshToastProps => o.variant === 'needRefresh';

export const ServiceWorkerToast = (props: ServiceWorkerToastProps) => {
  const { t } = useTranslation('halo');
  const { variant } = props;
  return (
    <Toast
      initiallyOpen
      title={
        variant === 'needRefresh' ? (
          <>
            <Gift className={cx(getSize(5), 'inline mr-1')} weight='duotone' />
            <span>{t('need refresh label')}</span>
          </>
        ) : (
          t('offline ready label')
        )
      }
      {...(isNeedRefreshToast(props) && {
        duration: 240e3,
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
        closeTrigger: <Button>{t('confirm label', { ns: 'uikit' })}</Button>
      })}
    />
  );
};
