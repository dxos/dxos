//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface, useCapability } from '@dxos/app-framework/react';
import { AlertDialog, Dialog as NaturalDialog } from '@dxos/react-ui';

import { SimpleLayoutState } from '../../types';
import { ContentError } from '../ContentError';

export const Dialog = () => {
  const layout = useCapability(SimpleLayoutState);

  const DialogRoot = layout.dialogType === 'alert' ? AlertDialog.Root : NaturalDialog.Root;
  const DialogOverlay = layout.dialogType === 'alert' ? AlertDialog.Overlay : NaturalDialog.Overlay;

  return (
    <DialogRoot
      modal={layout.dialogBlockAlign !== 'end'}
      open={layout.dialogOpen}
      onOpenChange={(nextOpen) => (layout.dialogOpen = nextOpen)}
    >
      {layout.dialogBlockAlign === 'end' ? (
        <Surface role='dialog' data={layout.dialogContent} limit={1} fallback={ContentError} placeholder={<div />} />
      ) : (
        <DialogOverlay
          blockAlign={layout.dialogBlockAlign}
          classNames={layout.dialogOverlayClasses}
          style={layout.dialogOverlayStyle}
        >
          <Surface role='dialog' data={layout.dialogContent} limit={1} fallback={ContentError} />
        </DialogOverlay>
      )}
    </DialogRoot>
  );
};
