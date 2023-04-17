//
// Copyright 2023 DXOS.org
//

import React, { FC, useState } from 'react';

import { TypedObject } from '@dxos/echo-schema';
import { DocumentStack } from '@dxos/kai-types';
import { StackMenu, StackMenuAction } from '@dxos/mosaic';

// TODO(burdon): Factor out to mosaic (with generic context).
export type ActionDialog = FC<{
  stack: DocumentStack;
  section?: DocumentStack.Section;
  // TODO(burdon): Unify with below.
  onAction: (stack: DocumentStack, section?: DocumentStack.Section, object?: TypedObject) => void;
  onClose: () => void;
}>;

export type CustomStackMenuAction = StackMenuAction & {
  Dialog?: ActionDialog;
  onAction?: (stack: DocumentStack, section?: DocumentStack.Section, object?: TypedObject) => void;
};

// TODO(burdon): Factor out (generic context, section).
export const CustomActionMenu: FC<{
  stack: DocumentStack;
  section?: DocumentStack.Section;
  actions: CustomStackMenuAction[][];
}> = ({ stack, section, actions }) => {
  const [action, setAction] = useState<any>();
  const handleAction = (action: CustomStackMenuAction, section: DocumentStack.Section) => {
    if (action.Dialog) {
      setAction(action);
    } else if (action.onAction) {
      action.onAction(stack, section);
    }
  };

  if (action) {
    const { Dialog, onAction } = action;
    return <Dialog stack={stack} section={section} onAction={onAction} onClose={() => setAction(undefined)} />;
  }

  return <StackMenu actions={actions} onAction={handleAction} />;
};
