//
// Copyright 2025 DXOS.org
//

// Translation definitions following the i18next pattern.
// Translations are organized into two namespaces:
// 1. `Type.getTypename(Schema)` — translations for the schema type (used by the framework
//    for object creation dialogs, deletion confirmations, etc.).
// 2. `meta.id` — plugin-specific translations (labels, actions, companions).

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { SampleItem } from '#types';

export const translations = [
  {
    'en-US': {
      // Typename translations used by the framework for UI chrome.
      [Type.getTypename(SampleItem.SampleItem)]: {
        'typename.label': 'Sample Item',
        'typename.label_zero': 'Sample Items',
        'typename.label_one': 'Sample Item',
        'typename.label_other': 'Sample Items',
        'object-name.placeholder': 'New sample item',
        'add-object.label': 'Add sample item',
        'rename-object.label': 'Rename sample item',
        'delete-object.label': 'Delete sample item',
        'object-deleted.label': 'Sample item deleted',
      },

      // Plugin-specific translations.
      [meta.id]: {
        'plugin.name': 'Sample',
        'create-sample-item.label': 'Create sample item',
        'archive-item.label': 'Archive item',
        'randomize-item.label': 'Randomize',
        'randomize-item-description.label': 'Replace all fields with random values.',
        'object-actions-section.label': 'Actions',
        'related-companion.label': 'Related',
        'deck-companion.label': 'Sample Panel',
        'show-status-indicator-setting.label': 'Show status indicator',
      },
    },
  },
] as const satisfies Resource[];
