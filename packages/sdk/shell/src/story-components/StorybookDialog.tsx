//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Next } from '@dxos/react-ui';

export type StorybookDialogProps = PropsWithChildren & {
  /** Passed to `Dialog.Content` (default `md`). */
  size?: Next.Size;
  /** Passed to `Dialog.Overlay` (default `center`). */
  blockAlign?: 'center' | 'start' | 'end';
};

/**
 * Renders shell story content inside a real `Dialog` so Storybook matches production
 * layout, portal/overlay behavior, and focus management.
 */
export const StorybookDialog = ({ children, size = 'md', blockAlign = 'center' }: StorybookDialogProps) => {
  return (
    <Next.Dialog.Root defaultOpen modal>
      <Next.Dialog.Content size={size}>
        <Next.Dialog.Header>
          <Next.Dialog.Title classNames='sr-only'>Storybook Dialog</Next.Dialog.Title>
        </Next.Dialog.Header>
        <Next.Dialog.Body>{children}</Next.Dialog.Body>
      </Next.Dialog.Content>
    </Next.Dialog.Root>
  );
};
