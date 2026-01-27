//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/react';
import { AlertDialog, Dialog as NaturalDialog } from '@dxos/react-ui';

import { useSimpleLayoutState } from '../../hooks';
import { ContentError } from '../ContentError';

export const Dialog = () => {
  const { state, updateState } = useSimpleLayoutState();

  const DialogRoot = state.dialogType === 'alert' ? AlertDialog.Root : NaturalDialog.Root;
  const DialogOverlay = state.dialogType === 'alert' ? AlertDialog.Overlay : NaturalDialog.Overlay;

  return (
    <DialogRoot
      modal={state.dialogBlockAlign !== 'end'}
      open={state.dialogOpen}
      onOpenChange={(nextOpen) => updateState((s) => ({ ...s, dialogOpen: nextOpen }))}
    >
      {state.dialogBlockAlign === 'end' ? (
        <Surface role='dialog' data={state.dialogContent} limit={1} fallback={ContentError} placeholder={<div />} />
      ) : (
        <DialogOverlay
          blockAlign={state.dialogBlockAlign}
          classNames={state.dialogOverlayClasses}
          style={state.dialogOverlayStyle}
        >
          <Surface role='dialog' data={state.dialogContent} limit={1} fallback={ContentError} />
        </DialogOverlay>
      )}
    </DialogRoot>
  );
};
