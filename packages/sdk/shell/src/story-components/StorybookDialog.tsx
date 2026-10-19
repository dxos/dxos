//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import * as Dialog from '@dxos/react-ui/Dialog';
import type * as Util from '@dxos/react-ui/Util';

export type StorybookDialogProps = PropsWithChildren & {
  /** Passed to `Dialog.Content` (default `md`). */
  size?: Util.Size;
  /** A Dialog.Header for a lone step, which (unlike a panel) has no heading of its own. */
  title?: string;
};

/**
 * Renders shell story content as the parts of a real `Dialog.Content` so Storybook matches production
 * layout, portal/overlay behavior, and focus management.
 */
export const StorybookDialog = ({ children, size = 'md', title }: StorybookDialogProps) => {
  return (
    <Dialog.Root defaultOpen modal>
      <Dialog.Content size={size}>
        {title && (
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
          </Dialog.Header>
        )}
        {children}
      </Dialog.Content>
    </Dialog.Root>
  );
};
