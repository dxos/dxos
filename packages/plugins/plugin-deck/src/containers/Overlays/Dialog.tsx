//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { AlertDialog, Dialog as NaturalDialog } from '@dxos/react-ui';

import { useDeckState } from '#hooks';

import { PlankErrorFallback } from '../Deck/PlankFallback.tsx';

export const Dialog = () => {
  const { state, updateEphemeral } = useDeckState();
  const { dialogOpen, dialogType, dialogBlockAlign, dialogOverlayClasses, dialogOverlayStyle, dialogContent } = state;
  const Root = dialogType === 'alert' ? AlertDialog.Root : NaturalDialog.Root;
  const Overlay = dialogType === 'alert' ? AlertDialog.Overlay : NaturalDialog.Overlay;

  // Closing clears the content in the same update that closes the dialog, but the overlay stays
  // mounted for its exit animation. Rendering the outgoing content until then is what lets the
  // dialog play its own exit instead of vanishing, leaving a dimmed screen with nothing on it.
  const closing = useRef(dialogContent);
  if (dialogContent) {
    closing.current = dialogContent;
  }
  const content = dialogContent ?? closing.current;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      updateEphemeral((s) => ({ ...s, dialogOpen: nextOpen }));
    },
    [updateEphemeral],
  );

  // TODO(thure): End block alignment affecting `modal` and whether the surface renders in an overlay is tailored to the needs of the ambient chat dialog. As the feature matures, consider separating concerns.
  return (
    <Root modal={dialogBlockAlign !== 'end'} open={dialogOpen} onOpenChange={handleOpenChange}>
      {dialogBlockAlign === 'end' ? (
        // TODO(burdon): Placeholder creates a suspense boundary; replace with defaults.
        <Surface.Surface
          type={AppSurface.Dialog}
          data={content ?? undefined}
          limit={1}
          fallback={PlankErrorFallback}
          placeholder={<div />}
        />
      ) : (
        <Overlay blockAlign={dialogBlockAlign} classNames={dialogOverlayClasses} style={dialogOverlayStyle}>
          <Surface.Surface
            type={AppSurface.Dialog}
            data={content ?? undefined}
            limit={1}
            fallback={PlankErrorFallback}
          />
        </Overlay>
      )}
    </Root>
  );
};

Dialog.displayName = 'Dialog';
