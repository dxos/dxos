//
// Copyright 2023 DXOS.org
//

import { Stack as StackIcon } from '@phosphor-icons/react';
import React from 'react';

import { Space } from '@dxos/client';
import { Document, DocumentStack } from '@dxos/kai-types';

import { FrameRuntime } from '../../registry';

const StackFrame = React.lazy(() => import('./StackFrame'));

export const StackFrameRuntime: FrameRuntime<DocumentStack> = {
  Icon: StackIcon,
  Component: StackFrame,
  title: 'title',
  filter: () => DocumentStack.filter(),
  onCreate: async (space: Space) => {
    const stack = new DocumentStack();
    const section = new DocumentStack.Section({ object: new Document() });
    stack.sections.push(section);
    return space.db.add(stack);
  }
};
