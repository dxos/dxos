//
// Copyright 2023 DXOS.org
//

import { Article, Image, ListChecks, Table as TableIcon, Trash } from '@phosphor-icons/react';
import { StackMenu } from 'packages/experimental/mosaic/src';
import React, { FC, useState } from 'react';

import { TypedObject, Space } from '@dxos/client';
import { Contact, Document, DocumentStack, File, Table, TaskList } from '@dxos/kai-types';
import { StackMenuItem } from '@dxos/mosaic';

import { FilePlugin, imageTypes } from '../File';
import { ContextMenuItem } from './ContextMenu';

export type ObjectSelector = FC<{ onSelect: (objectId: string | undefined) => void }>;

export const FileSelector: ObjectSelector = ({ onSelect }) => {
  return <FilePlugin disableDownload fileTypes={imageTypes} onSelect={onSelect} />;
};

export type StackItemType = ContextMenuItem & {
  onCreate?: (space: Space) => Promise<TypedObject>;
  Selector?: ObjectSelector;
};

export const sectionMenuItems = (section?: DocumentStack.Section) =>
  [
    [
      {
        id: Document.type.name,
        label: 'Text',
        Icon: Article
      },
      {
        id: TaskList.type.name,
        label: 'Tasks',
        Icon: ListChecks
      },
      {
        id: TaskList.type.name,
        label: 'Table',
        Icon: TableIcon
      },
      {
        id: File.type.name,
        label: 'Image',
        Icon: Image
      }
    ],
    section && [
      {
        id: '__delete',
        label: 'Delete section',
        Icon: Trash
      }
    ]
  ].filter(Boolean) as StackMenuItem[][];

export const ContextMenu: FC<{ stack: DocumentStack; section?: DocumentStack.Section }> = ({ stack, section }) => {
  const [selector, setSelector] = useState(undefined);

  // TODO(burdon): Factor out generators and dialog.
  const handleMenu = (item: StackMenuItem, section?: any) => {
    const sections = stack.sections;
    const idx = sections.findIndex(({ id }) => id === section.id);
    switch (item.id) {
      case 'delete': {
        sections.splice(idx, 1);
        break;
      }
    }
  };

  return (
    <>
      <StackMenu items={sectionMenuItems(section)} onSelect={handleMenu} />
    </>
  );
};

// TODO(burdon): Remove.
export const defaultItems: StackItemType[] = [
  {
    type: Document.type.name,
    label: 'Text',
    Icon: Article,
    onCreate: async (space: Space) => space!.db.add(new Document())
  },
  {
    type: TaskList.type.name,
    label: 'Task list',
    Icon: ListChecks,
    onCreate: async (space: Space) => space!.db.add(new TaskList())
  },
  {
    type: TaskList.type.name,
    label: 'Table',
    Icon: TableIcon,
    onCreate: async (space: Space) => space!.db.add(new Table({ type: Contact.type.name }))
  },
  {
    type: File.type.name,
    label: 'Image',
    Icon: Image,
    Selector: FileSelector
  }
];
