//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useLayoutEffect, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { AlertDialog, Dialog as UiDialog } from '@dxos/react-ui';

import { useDeckState } from '#hooks';

import { PlankErrorFallback } from '../Deck/PlankFallback.tsx';

/** The surface's suspense placeholder: reports while the dialog's lazily loaded content is still loading. */
const Pending = ({ onPendingChange }: { onPendingChange: (pending: boolean) => void }) => {
  useLayoutEffect(() => {
    onPendingChange(true);
    return () => onPendingChange(false);
  }, [onPendingChange]);
  return <div />;
};

export const Dialog = () => {
  const { invokePromise } = useOperationInvoker();
  const { state } = useDeckState();
  const { dialogOpen, dialogType, dialogBlockAlign, dialogContent } = state;
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

  // TODO(thure): End block alignment affecting `modal` is tailored to the needs of the ambient chat dialog. As the feature matures, consider separating concerns.
  // The surface renders the dialog's Content, which takes its placement from the Root unless it sets its own.
  return (
    <Root
      modal={dialogBlockAlign !== 'end'}
      placement={dialogBlockAlign}
      open={dialogOpen && !pending}
      onOpenChange={handleOpenChange}
    >
      <Surface.Surface
        type={AppSurface.Dialog}
        data={dialogContent ?? undefined}
        limit={1}
        fallback={PlankErrorFallback}
        placeholder={<Pending onPendingChange={setPending} />}
      />
    </Root>
  );
};

Dialog.displayName = 'Dialog';
