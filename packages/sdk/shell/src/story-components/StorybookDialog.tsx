//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Dialog, type Size } from '@dxos/react-ui';

export type StorybookDialogProps = PropsWithChildren & {
  /** Passed to `Dialog.Content` (default `md`). */
  size?: Size;
  /** Passed to `Dialog.Overlay` (default `center`). */
  blockAlign?: 'center' | 'start' | 'end';
};

/**
 * Renders shell story content inside a real `Dialog` so Storybook matches production
 * layout, portal/overlay behavior, and focus management.
 */
export const StorybookDialog = ({ children, size = 'md', blockAlign = 'center' }: StorybookDialogProps) => {
  return (
    <Dialog.Root defaultOpen modal>
      <Dialog.Content size={size}>
        <Dialog.Header>
          <Dialog.Title classNames='sr-only'>Storybook Dialog</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>{children}</Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};
