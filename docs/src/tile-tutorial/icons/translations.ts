//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

// #region resource
export const ns = 'com.example.contacts';

export const translations = [
  {
    'en-US': {
      [ns]: {
        'title.label': 'Contacts',
        'count.label_one': '{{count}} contact',
        'count.label_other': '{{count}} contacts',
        'add.label': 'Add contact',
        'edit.label': 'Edit contact',
        'delete.label': 'Delete contact',
        'empty.message': 'Choose a contact',
        'new-contact.name': 'New contact',
        'role.viewer': 'Can read the contact book',
        'role.editor': 'Can change contacts',
        'role.admin': 'Can change contacts and who has access',
      },
    },
  },
] as const satisfies Theme.Resource[];
// #endregion
