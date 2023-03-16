//
// Copyright 2023 DXOS.org
//

import { Article, Image, ListChecks, Table as TableIcon } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Document, Space } from '@dxos/client';
import { Contact, Document as DocumentType, File, Table, TaskList } from '@dxos/kai-types';

import { FileList } from '../File';
import { ContextMenuItem } from './ContextMenu';

export type StackItemType = ContextMenuItem & {
  onCreate?: (space: Space) => Promise<Document>;
};

const FileSelector: FC<{ onSelect: (objectId: string | undefined) => void }> = ({ onSelect }) => {
  return <FileList disableDownload onSelect={onSelect} />;
};

// TODO(burdon): Factor out.
export const defaultItems: StackItemType[] = [
  {
    type: DocumentType.type.name,
    label: 'Text',
    Icon: Article,
    onCreate: async (space: Space) => space!.db.add(new DocumentType())
  },
  {
    type: TaskList.type.name,
    label: 'Task list',
    Icon: ListChecks,
    onCreate: async (space: Space) => space!.db.add(new TaskList())
  },
  {
    type: Table.type.name,
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
