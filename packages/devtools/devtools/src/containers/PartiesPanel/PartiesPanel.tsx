//
// Copyright 2020 DXOS.org
//
import React from 'react';

import { useParties } from '@dxos/react-client';

import { PartyTable } from '../../components';

export const PartiesPanel = () => {
  const parties = useParties();
  if (parties === undefined) {
    return null;
  }
  return <PartyTable parties={parties} />;
};
