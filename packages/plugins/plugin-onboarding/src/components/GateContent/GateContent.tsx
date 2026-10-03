//
// Copyright 2026 DXOS.org
//

import React, { type ComponentType, type PropsWithChildren } from 'react';

import { AlertDialog } from '@dxos/react-ui';

/**
 * Dialog content for the always-dark login gate. The screen inside paints its own card over the host's full-screen
 * backdrop, so the dialog's own chrome is dropped. Fills a phone's screen and sizes to the card from `md` up.
 */
export const GateContent = ({ children }: PropsWithChildren) => (
  <AlertDialog.Content classNames='dark dx-fill md:w-auto md:h-auto max-w-none max-h-none p-0 bg-transparent! border-0! rounded-none shadow-none! overflow-visible items-center justify-center'>
    {children}
  </AlertDialog.Content>
);

/** Renders a gate screen as a dialog surface's content. */
export const withGateContent =
  <P extends object>(Component: ComponentType<P>) =>
  (props: P) => (
    <GateContent>
      <Component {...props} />
    </GateContent>
  );
