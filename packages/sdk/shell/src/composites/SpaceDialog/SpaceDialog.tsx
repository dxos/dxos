//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';

import { SpacePanel, type SpacePanelProps } from '../../panels/index.ts';

type DialogContentProps = React.ComponentProps<typeof Dialog.Content>;

export interface SpaceDialogProps
  extends Omit<DialogContentProps, 'children'>, Omit<SpacePanelProps, 'doneActionParent'> {}

export const SpaceDialog = (spacePanelProps: SpaceDialogProps) => {
  const titleId = Hooks.useId('spaceDialog__title');
  return (
    <Dialog.Root defaultOpen onOpenChange={({ open }) => open || spacePanelProps.onDone?.()}>
      <Dialog.Content aria-labelledby={titleId}>
        <Dialog.Body>
          <SpacePanel
            {...{
              ...spacePanelProps,
              titleId,
              doneActionParent: <Dialog.CloseTrigger asChild />,
            }}
          />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};
