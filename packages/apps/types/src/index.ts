//
// Copyright 2023 DXOS.org
//

import {
  Chain as ChainType,
  Grid as GridType,
  Mailbox as MailboxType,
  AddressBook as AddressBookType,
  Calendar as CalendarType,
  View as ViewType,
  Kanban as KanbanType,
  Tree as TreeType,
  Sketch as SketchType,
  Folder as FolderType,
  Stack as StackType,
  Table as TableType,
  Thread as ThreadType,
} from './proto';

export * from './proto';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[AddressBookType.name] = AddressBookType;
(globalThis as any)[CalendarType.name] = CalendarType;
(globalThis as any)[ChainType.name] = ChainType;
(globalThis as any)[DocumentType.name] = DocumentType;
(globalThis as any)[FolderType.name] = FolderType;
(globalThis as any)[GridType.name] = GridType;
(globalThis as any)[KanbanType.name] = KanbanType;
(globalThis as any)[MailboxType.name] = MailboxType;
(globalThis as any)[SketchType.name] = SketchType;
(globalThis as any)[StackType.name] = StackType;
(globalThis as any)[TableType.name] = TableType;
(globalThis as any)[ThreadType.name] = ThreadType;
(globalThis as any)[TreeType.name] = TreeType;
(globalThis as any)[ViewType.name] = ViewType;
