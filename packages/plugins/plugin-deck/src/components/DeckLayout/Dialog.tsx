//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { AlertDialog, Dialog as NaturalDialog } from '@dxos/react-ui';

import { useDeckState } from '../../hooks';
import { PlankContentError } from '../Plank';

export const Dialog = () => {
  const { state, update } = useDeckState();
  const { dialogOpen, dialogType, dialogBlockAlign, dialogOverlayClasses, dialogOverlayStyle, dialogContent } = state;
  const Root = dialogType === 'alert' ? AlertDialog.Root : NaturalDialog.Root;
  const Overlay = dialogType === 'alert' ? AlertDialog.Overlay : NaturalDialog.Overlay;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      update((s) => ({ ...s, dialogOpen: nextOpen }));
    },
    [update],
  );

  // TODO(thure): End block alignment affecting `modal` and whether the surface renders in an overlay is tailored to the needs of the ambient chat dialog. As the feature matures, consider separating concerns.
  return (
    <Root modal={dialogBlockAlign !== 'end'} open={dialogOpen} onOpenChange={handleOpenChange}>
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
