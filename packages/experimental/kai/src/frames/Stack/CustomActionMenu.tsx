//
// Copyright 2023 DXOS.org
//

import React, { FC, useState } from 'react';

import { DocumentStack } from '@dxos/kai-types';
import { StackMenu, StackMenuAction } from '@dxos/mosaic';

// TODO(burdon): Factor out context.
export type ActionDialog = FC<{ stack: DocumentStack; section?: DocumentStack.Section; onClose: () => void }>;

export type CustomStackMenuAction = StackMenuAction & {
  Dialog?: ActionDialog;
  onAction?: (stack: DocumentStack, section?: DocumentStack.Section) => void;
};

// TODO(burdon): Factor out (generic context, section).
export const CustomActionMenu: FC<{
  stack: DocumentStack;
  section?: DocumentStack.Section;
  actions: CustomStackMenuAction[][];
}> = ({ stack, section, actions }) => {
  const [Dialog, setDialog] = useState<ActionDialog>();
  const handleAction = (action: CustomStackMenuAction, section: DocumentStack.Section) => {
    if (action.Dialog) {
      // TODO(burdon): Not working.
      // setDialog(action.Dialog);
    } else if (action.onAction) {
      action.onAction(stack, section);
    }
  };

  return (
    <>
      {(Dialog && <Dialog stack={stack} section={section} onClose={() => setDialog(undefined)} />) || (
        <StackMenu actions={actions} onAction={handleAction} />
      )}
    </>
  );
};
