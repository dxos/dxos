//
// Copyright 2023 DXOS.org
//

import React, { Dispatch, SetStateAction } from 'react';

import { ServiceWorkerToast } from './ServiceWorkerToast';

export type ServiceWorkerToastContainerProps = {
  needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
  offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
};

// TODO: merge this with ServiceWorkerToast a little better
export const ServiceWorkerToastContainer = (props: ServiceWorkerToastContainerProps) => {
  const { needRefresh, offlineReady, updateServiceWorker } = props;
  return needRefresh ? (
    <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
  ) : offlineReady ? (
    <ServiceWorkerToast variant='offlineReady' />
  ) : null;
};
