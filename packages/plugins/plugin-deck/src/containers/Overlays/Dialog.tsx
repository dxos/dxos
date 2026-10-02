//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AlertDialog, Dialog as NaturalDialog } from '@dxos/react-ui';

import { useDeckState } from '#hooks';

import { PlankErrorFallback } from '../Deck/PlankFallback.tsx';

export const Dialog = () => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const { state } = useDeckState();
  const { dialogOpen, dialogType, dialogBlockAlign, dialogOverlayClasses, dialogOverlayStyle, dialogContent } = state;
  const Root = dialogType === 'alert' ? AlertDialog.Root : NaturalDialog.Root;
  const Overlay = dialogType === 'alert' ? AlertDialog.Overlay : NaturalDialog.Overlay;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        void invokePromise(LayoutOperation.UpdateDialog, { state: false });
      }
    },
    [invokePromise],
  );

  // TODO(thure): End block alignment affecting `modal` and whether the surface renders in an overlay is tailored to the needs of the ambient chat dialog. As the feature matures, consider separating concerns.
  return (
    <Root modal={dialogBlockAlign !== 'end'} open={dialogOpen} onOpenChange={handleOpenChange}>
      {dialogBlockAlign === 'end' ? (
        // TODO(burdon): Placeholder creates a suspense boundary; replace with defaults.
        <Surface.Root.Surface
          type={AppSurface.Dialog}
          data={dialogContent ?? undefined}
          limit={1}
          fallback={PlankErrorFallback}
          placeholder={<div />}
        />
      ) : (
        <Overlay
          blockAlign={dialogBlockAlign}
          classNames={['dx-main-dialog', dialogOverlayClasses]}
          style={dialogOverlayStyle}
        >
          <Surface.Root.Surface
            type={AppSurface.Dialog}
            data={dialogContent ?? undefined}
            limit={1}
            fallback={PlankErrorFallback}
          />
        </Overlay>
      )}
    </Root>
  );
};

Dialog.displayName = 'Dialog';
