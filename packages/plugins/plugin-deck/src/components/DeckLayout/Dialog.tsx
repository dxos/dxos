//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface, useCapability } from '@dxos/app-framework/react';
import { AlertDialog, Dialog as NaturalDialog } from '@dxos/react-ui';

import { DeckCapabilities } from '../../types';
import { PlankContentError } from '../Plank';

export const Dialog = () => {
  const context = useCapability(DeckCapabilities.MutableDeckState);
  const { dialogOpen, dialogType, dialogBlockAlign, dialogOverlayClasses, dialogOverlayStyle, dialogContent } = context;
  const Root = dialogType === 'alert' ? AlertDialog.Root : NaturalDialog.Root;
  const Overlay = dialogType === 'alert' ? AlertDialog.Overlay : NaturalDialog.Overlay;

  // TODO(thure): End block alignment affecting `modal` and whether the surface renders in an overlay is tailored to the needs of the ambient chat dialog. As the feature matures, consider separating concerns.
  return (
    <Root
      modal={dialogBlockAlign !== 'end'}
      open={dialogOpen}
      onOpenChange={(nextOpen) => (context.dialogOpen = nextOpen)}
    >
      {dialogBlockAlign === 'end' ? (
        // TODO(burdon): Placeholder creates a suspense boundary; replace with defaults.
        <Surface role='dialog' data={dialogContent} limit={1} fallback={PlankContentError} placeholder={<div />} />
      ) : (
        <Overlay blockAlign={dialogBlockAlign} classNames={dialogOverlayClasses} style={dialogOverlayStyle}>
          <Surface role='dialog' data={dialogContent} limit={1} fallback={PlankContentError} />
        </Overlay>
      )}
    </Root>
  );
};
