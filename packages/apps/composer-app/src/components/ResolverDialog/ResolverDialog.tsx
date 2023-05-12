//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PanelAlertDialog } from '@dxos/react-shell';

import { ResolverTree } from './ResolverTree';

export const ResolverDialog = ({ source, id }: { source: string; id: string }) => {
  return (
    <PanelAlertDialog titleId=''>
      <ResolverTree {...{ source, id }} />
    </PanelAlertDialog>
  );
};
