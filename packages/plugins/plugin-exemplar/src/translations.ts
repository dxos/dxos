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
import { ExemplarItem } from '#types';

export const translations = [
  {
    'en-US': {
      // Typename translations used by the framework for UI chrome.
      [Type.getTypename(ExemplarItem.ExemplarItem)]: {
        'typename.label': 'Exemplar Item',
        'typename.label_zero': 'Exemplar Items',
        'typename.label_one': 'Exemplar Item',
        'typename.label_other': 'Exemplar Items',
        'object-name.placeholder': 'New exemplar item',
        'add-object.label': 'Add exemplar item',
        'rename-object.label': 'Rename exemplar item',
        'delete-object.label': 'Delete exemplar item',
        'object-deleted.label': 'Exemplar item deleted',
      },

      // Plugin-specific translations.
      [meta.id]: {
        'plugin.name': 'Exemplar',
        'create-exemplar-item.label': 'Create exemplar item',
        'archive-item.label': 'Archive item',
        'randomize-item.label': 'Randomize',
        'randomize-item-description.label': 'Replace all fields with random values.',
        'object-actions-section.label': 'Actions',
        'related-companion.label': 'Related',
        'deck-companion.label': 'Exemplar Panel',
        'show-status-indicator-setting.label': 'Show status indicator',
      },
    },
  },
] as const satisfies Resource[];
