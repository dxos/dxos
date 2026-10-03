//
// Copyright 2023 DXOS.org
//

import React, { useRef } from 'react';

import { Dialog, useId } from '@dxos/react-ui';

import { IdentityPanel, type IdentityPanelProps } from '../../panels/index.ts';

type DialogContentProps = React.ComponentProps<typeof Dialog.Content>;

export interface IdentityDialogProps
  extends Omit<DialogContentProps, 'children'>, Omit<IdentityPanelProps, 'doneActionParent'> {
  onDone: () => void;
}

export const IdentityDialog = (props: IdentityDialogProps) => {
  const titleId = useId('identityDialog__title', props.title);
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root
      defaultOpen
      onOpenChange={({ open }) => open || props.onDone?.()}
      // Focus the dialog itself rather than its first control, so no field opens with a caret.
      initialFocusEl={() => contentRef.current}
    >
      <Dialog.Content aria-labelledby={titleId} ref={contentRef}>
        <Dialog.Body>
          <IdentityPanel
            {...{
              ...props,
              titleId,
              doneActionParent: <Dialog.CloseTrigger asChild />,
            }}
          />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};
