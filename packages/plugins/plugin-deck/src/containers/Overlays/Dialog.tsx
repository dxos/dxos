//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { AlertDialog, Dialog as NaturalDialog } from '@dxos/react-ui';

import { useDeckState, useLastPresent } from '#hooks';

import { PlankErrorFallback } from '../Deck/PlankFallback.tsx';

export const Dialog = () => {
  const { invokePromise } = useOperationInvoker();
  const { state } = useDeckState();
  const { dialogOpen, dialog } = state;
  // Held as one value for the length of the exit: the overlay is still on screen after the state that
  // fed it is gone, and a field of it reverting there would restyle a dialog the reader can still see.
  const presentation = useLastPresent(dialogOpen, dialog);
  const Root = presentation?.type === 'alert' ? AlertDialog.Root : NaturalDialog.Root;
  const Overlay = presentation?.type === 'alert' ? AlertDialog.Overlay : NaturalDialog.Overlay;
  const blockAlign = presentation?.blockAlign;

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
    <Root modal={blockAlign !== 'end'} open={dialogOpen} onOpenChange={handleOpenChange}>
      {blockAlign === 'end' ? (
        // TODO(burdon): Placeholder creates a suspense boundary; replace with defaults.
        <Surface.Surface
          type={AppSurface.Dialog}
          data={presentation?.content}
          limit={1}
          fallback={PlankErrorFallback}
          placeholder={<div />}
        />
      ) : (
        // `dx-main-dialog` names this overlay for view transitions. The shared component class cannot
        // carry the name: a transition aborts outright when two rendered elements claim the same one.
        <Overlay
          blockAlign={blockAlign}
          classNames={['dx-main-dialog', presentation?.overlayClasses]}
          style={presentation?.overlayStyle}
        >
          <Surface.Surface
            type={AppSurface.Dialog}
            data={presentation?.content}
            limit={1}
            fallback={PlankErrorFallback}
          />
        </Overlay>
      )}
    </Root>
  );
};

Dialog.displayName = 'Dialog';
