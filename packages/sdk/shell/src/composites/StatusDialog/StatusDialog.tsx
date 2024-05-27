//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AlertDialog, useId } from '@dxos/react-ui';

import { StatusPanel } from '../../panels';

export const StatusDialog = () => {
  const titleId = useId('statusDialog__title');
  return (
    <AlertDialog.Root open>
      <AlertDialog.Portal>
        <AlertDialog.Overlay>
          <AlertDialog.Content aria-labelledby={titleId}>
            <StatusPanel titleId={titleId} />
          </AlertDialog.Content>
        </AlertDialog.Overlay>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
