//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useId } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { SpacePanel, type SpacePanelProps } from '../../panels/index.ts';

type DialogContentProps = React.ComponentProps<typeof Next.Dialog.Content>;

export interface SpaceDialogProps
  extends Omit<DialogContentProps, 'children'>, Omit<SpacePanelProps, 'doneActionParent'> {}

export const SpaceDialog = (spacePanelProps: SpaceDialogProps) => {
  const titleId = useId('spaceDialog__title');
  return (
    <Next.Dialog.Root defaultOpen onOpenChange={(open) => open || spacePanelProps.onDone?.()}>
      <Next.Dialog.Content aria-labelledby={titleId}>
        <Next.Dialog.Body>
          <SpacePanel
            {...{
              ...spacePanelProps,
              titleId,
              doneActionParent: <Next.Dialog.CloseTrigger asChild />,
            }}
          />
        </Next.Dialog.Body>
      </Next.Dialog.Content>
    </Next.Dialog.Root>
  );
};
