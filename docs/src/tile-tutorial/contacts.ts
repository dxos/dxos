//
// Copyright 2026 DXOS.org
//

import type * as Select from '@dxos/react-ui/Select';

// #region contact
export type Contact = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export const ROLES: Select.Option[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
];

export const CONTACTS: Contact[] = [
  { id: 'ada', name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin' },
  { id: 'grace', name: 'Grace Hopper', email: 'grace@example.com', role: 'editor' },
  { id: 'alan', name: 'Alan Turing', email: 'alan@example.com', role: 'viewer' },
  { id: 'katherine', name: 'Katherine Johnson', email: 'katherine@example.com', role: 'editor' },
];
// #endregion
