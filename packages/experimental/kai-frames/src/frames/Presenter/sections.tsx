//
// Copyright 2022 DXOS.org
//

import { Article, Trash } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Document, DocumentStack } from '@dxos/kai-types';
import { TypedObject, useIdentity } from '@dxos/react-client';
import { Composer } from '@dxos/react-composer';

import { useFrameContext } from '../../hooks';
import { CustomStackMenuAction } from '../Stack';

// TODO(burdon): Generalize with Stack.
export const sectionActions = (section?: DocumentStack.Section) => {
  const insert = (stack: DocumentStack, section: DocumentStack.Section | undefined, object: TypedObject) => {
    const idx = section ? stack.sections.findIndex(({ id }) => id === section.id) : stack.sections.length;
    stack.sections.splice(idx, 0, new DocumentStack.Section({ object }));
  };

  const actions: CustomStackMenuAction[][] = [
    [
      {
        id: Document.type.name,
        label: 'New slide',
        Icon: Article,
        onAction: (stack, section) => insert(stack, section, new DocumentStack.Section({ object: new Document() }))
      }
    ]
  ];

  if (section) {
    actions.push([
      {
        id: 'delete',
        label: 'Delete',
        Icon: Trash,
        onAction: (stack, section) => {
          const idx = stack.sections.findIndex(({ id }) => id === section!.id);
          stack.sections.splice(idx, 1);
        }
      }
    ]);
  }

  return actions;
};

export const StackSection: FC<{ section: DocumentStack.Section }> = ({ section }) => {
  const identity = useIdentity();
  const { space } = useFrameContext();
  const object = section.object;

  return (
    <Composer
      identity={identity}
      space={space}
      text={object.content}
      slots={{
        editor: {
          spellCheck: false // TODO(burdon): Config.
        }
      }}
    />
  );
};
