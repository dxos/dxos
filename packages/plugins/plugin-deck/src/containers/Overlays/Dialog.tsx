//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useLayoutEffect, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import * as UiDialog from '@dxos/react-ui/Dialog';

import { useDeckState } from '#hooks';

import { PlankErrorFallback } from '../Deck/PlankFallback.tsx';

const overlayClasses = [
  'dx-fill max-w-none max-h-none grid place-items-center rounded-none border-0 shadow-none',
  'py-[env(safe-area-inset-top)] sm:p-[calc(env(safe-area-inset-top)+.6rem)]',
  'md:p-[calc(env(safe-area-inset-top)+1.2rem)] lg:p-[calc(env(safe-area-inset-top)+2.4rem)]',
];

/** The surface's suspense placeholder: reports while the dialog's lazily loaded content is still loading. */
const Pending = ({ onPendingChange }: { onPendingChange: (pending: boolean) => void }) => {
  useLayoutEffect(() => {
    onPendingChange(true);
    return () => onPendingChange(false);
  }, [onPendingChange]);
  return <div />;
};

export const Dialog = () => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const { state } = useDeckState();
  const { dialogOpen, dialogType, dialogBlockAlign, dialogOverlayClasses, dialogOverlayStyle, dialogContent } = state;
  const Root = dialogType === 'alert' ? AlertDialog.Root : UiDialog.Root;
  // zag's dismiss layer looks for the content once on open, so the Root opens only after a lazily loaded content mounts.
  const [pending, setPending] = useState(false);

  const handleOpenChange = useCallback(
    ({ open }: { open: boolean }) => {
      if (!open) {
        void invokePromise(LayoutOperation.UpdateDialog, { state: false });
      }
    },
    [invokePromise],
  );

  const hostRendersOverlay = dialogOverlayClasses !== undefined || dialogOverlayStyle !== undefined;
  const surface = (
    <Surface.Surface
      type={AppSurface.Dialog}
      data={dialogContent ?? undefined}
      limit={1}
      fallback={PlankErrorFallback}
      placeholder={hostRendersOverlay ? <div /> : <Pending onPendingChange={setPending} />}
    />
  );

  // TODO(thure): End block alignment affecting `modal` is tailored to the needs of the ambient chat dialog. As the feature matures, consider separating concerns.
  return (
    <Root
      modal={dialogBlockAlign !== 'end'}
      placement={dialogBlockAlign}
      open={dialogOpen && !pending}
      onOpenChange={handleOpenChange}
    >
      {hostRendersOverlay ? (
        <UiDialog.Content scrim={false} classNames={[overlayClasses, dialogOverlayClasses]} style={dialogOverlayStyle}>
          {surface}
        </UiDialog.Content>
      ) : (
        surface
      )}
    </Root>
  );
};

Dialog.displayName = 'Dialog';
