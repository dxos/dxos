//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Clipboard, Dialog, Tooltip } from '@dxos/react-ui';
import { type DialogSize } from '@dxos/ui-theme';

export type StorybookDialogProps = PropsWithChildren & {
  /** Passed to `Dialog.Content` (default `md`). */
  size?: DialogSize;
  /** Passed to `Dialog.Overlay` (default `center`). */
  blockAlign?: 'center' | 'start' | 'end';
};

/**
 * Renders shell story content inside a real `Dialog` so Storybook matches production
 * layout, portal/overlay behavior, and focus management. `Dialog.Content` supplies
 * `Column.Root`; overlay layout is taken from `Dialog.Overlay` context.
 */
export const StorybookDialog = ({ children, size = 'md', blockAlign = 'center' }: StorybookDialogProps) => {
  return (
    <Tooltip.Provider>
      <Clipboard.Provider>
        <Dialog.Root defaultOpen modal>
          <Dialog.Overlay blockAlign={blockAlign}>
            <Dialog.Content size={size}>
              <Dialog.Header>
                <Dialog.Title classNames='sr-only'>Storybook Dialog</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>{children}</Dialog.Body>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Root>
      </Clipboard.Provider>
    </Tooltip.Provider>
  );
};
