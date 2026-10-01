//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Next } from '@dxos/react-ui';

import { useDeckState } from '#hooks';

import { PlankErrorFallback } from '../Deck/PlankFallback.tsx';

export const Dialog = () => {
  const { invokePromise } = useOperationInvoker();
  const { state } = useDeckState();
  const { dialogOpen, dialogType, dialogBlockAlign, dialogContent } = state;
  const Root = dialogType === 'alert' ? Next.AlertDialog.Root : Next.Dialog.Root;

  const handleOpenChange = useCallback(
    ({ open }: { open: boolean }) => {
      if (!open) {
        void invokePromise(LayoutOperation.UpdateDialog, { state: false });
      }
    },
    [invokePromise],
  );

  // TODO(thure): End block alignment affecting `modal` is tailored to the needs of the ambient chat dialog. As the feature matures, consider separating concerns.
  // The surface renders the dialog's Content, which takes its placement from the Root unless it sets its own.
  return (
    <Root
      modal={dialogBlockAlign !== 'end'}
      placement={dialogBlockAlign}
      open={dialogOpen}
      onOpenChange={handleOpenChange}
    >
      {/* TODO(burdon): Placeholder creates a suspense boundary; replace with defaults. */}
      <Surface.Surface
        type={AppSurface.Dialog}
        data={dialogContent ?? undefined}
        limit={1}
        fallback={PlankErrorFallback}
        placeholder={<div />}
      />
    </Root>
  );
};

Dialog.displayName = 'Dialog';
