//
// Copyright 2022 DXOS.org
//

import { Plus, Trash } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Document, DocumentStack, Presentation } from '@dxos/kai-types';
import { Stack, StackMenu, StackMenuItem } from '@dxos/mosaic';
import { observer } from '@dxos/react-client';

import { StackSection } from './sections';

// TODO(burdon): Styles for handle.
// TODO(burdon): Generalize section renderer.
// TODO(burdon): Header title.
// TODO(burdon): StackSection renderer.
// TODO(burdon): ContextMenu
// TODO(burdon): Rename Item.
// TODO(burdon): Factor out common content.

// TODO(burdon): Reconcile with regular Stack.
const sectionMenuItems = (section?: DocumentStack.Section) =>
  [
    [
      {
        id: 'insert',
        label: 'Insert slide',
        Icon: Plus
      }
    ],
    section && [
      {
        id: '__delete',
        label: 'Delete slide',
        Icon: Trash
      }
    ]
  ].filter(Boolean) as StackMenuItem[][];

export const DeckEditor: FC<{ presentation: Presentation }> = observer(({ presentation }) => {
  // TODO(burdon): Factor out.
  const handleMenu = (item: StackMenuItem, section?: any) => {
    const sections = presentation.stack.sections;
    const idx = sections.findIndex(({ id }) => id === section.id);
    switch (item.id) {
      case 'insert': {
        sections.splice(idx, 0, new DocumentStack.Section({ object: new Document() }));
        break;
      }

      case '__delete': {
        sections.splice(idx, 1);
        break;
      }
    }
  };

  const handleMoveSection = (id: string, from: number, to: number) => {
    const sections = presentation.stack.sections;
    const section = sections.find((section) => section.id === id);
    sections.splice(from, 1);
    sections.splice(to, 0, section!);
  };

  return (
    <div className='flex flex-col flex-1 justify-center overflow-y-auto w-full md:max-w-[800px] md:pt-4'>
      <Stack<DocumentStack.Section>
        slots={{ root: { className: 'py-12 bg-paper-bg shadow-1' }, section: { className: 'py-2' } }}
        sections={presentation.stack.sections}
        onMoveSection={handleMoveSection}
        ContextMenu={({ section }) => <StackMenu items={sectionMenuItems(section)} onSelect={handleMenu} />}
        StackSection={StackSection}
      />
    </div>
  );
});
