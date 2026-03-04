//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AlertDialog, Dialog as NaturalDialog } from '@dxos/react-ui';

import { useSimpleLayoutState } from '../../hooks';
import { ErrorFallback } from '@dxos/react-ui';

export const Dialog = () => {
  const { state, updateState } = useSimpleLayoutState();

  const DialogRoot = state.dialogType === 'alert' ? AlertDialog.Root : NaturalDialog.Root;
  const DialogOverlay = state.dialogType === 'alert' ? AlertDialog.Overlay : NaturalDialog.Overlay;

  return (
    <DialogRoot
      modal={state.dialogBlockAlign !== 'end'}
      open={state.dialogOpen}
      onOpenChange={(nextOpen) => updateState((state) => ({ ...state, dialogOpen: nextOpen }))}
    >
      {state.dialogBlockAlign === 'end' ? (
        <Surface.Surface role='dialog' data={state.dialogContent} limit={1} fallback={ErrorFallback} />
      ) : (
        <DialogOverlay
          blockAlign={state.dialogBlockAlign}
          classNames={state.dialogOverlayClasses}
          style={state.dialogOverlayStyle}
        >
          <Surface.Surface role='dialog' data={state.dialogContent} limit={1} fallback={ErrorFallback} />
        </DialogOverlay>
      )}
    </DialogRoot>
  );
};
