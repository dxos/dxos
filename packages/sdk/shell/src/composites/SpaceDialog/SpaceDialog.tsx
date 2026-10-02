//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';

import { SpacePanel, type SpacePanelProps } from '../../panels/index.ts';

export interface SpaceDialogProps
  extends Omit<Dialog.ContentProps, 'children'>, Omit<SpacePanelProps, 'doneActionParent'> {}

export const SpaceDialog = (spacePanelProps: SpaceDialogProps) => {
  const titleId = Hooks.useId('spaceDialog__title');
  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => open || spacePanelProps.onDone?.()}>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content aria-labelledby={titleId}>
            <Dialog.Body>
              <SpacePanel
                {...{
                  ...spacePanelProps,
                  titleId,
                  doneActionParent: <Dialog.Close asChild />,
                }}
              />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
