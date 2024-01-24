//
// Copyright 2023 DXOS.org
//

import {
  AddressBook as AddressBookType,
  Calendar as CalendarType,
  Chain as ChainType,
  Document as DocumentType,
  Folder as FolderType,
  Grid as GridType,
  Kanban as KanbanType,
  Mailbox as MailboxType,
  Map as MapType,
  Sketch as SketchType,
  Stack as StackType,
  Table as TableType,
  Thread as ThreadType,
  Tree as TreeType,
  View as ViewType,
} from './proto';

export * from './proto';

// TODO(burdon): Are these still required?
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
(globalThis as any)[MapType.name] = MapType;
(globalThis as any)[SketchType.name] = SketchType;
(globalThis as any)[StackType.name] = StackType;
(globalThis as any)[TableType.name] = TableType;
(globalThis as any)[ThreadType.name] = ThreadType;
(globalThis as any)[TreeType.name] = TreeType;
(globalThis as any)[ViewType.name] = ViewType;
