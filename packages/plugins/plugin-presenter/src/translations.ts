//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';
import { Presentation } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Presentation.Presentation)]: {
        'typename.label': 'Presentation',
        'typename.label_zero': 'Presentations',
        'typename.label_one': 'Presentation',
        'typename.label_other': 'Presentations',
        'object-name.placeholder': 'New presentation',
        'add-object.label': 'Add presentation',
        'rename-object.label': 'Rename presentation',
        'delete-object.label': 'Delete presentation',
        'object-deleted.label': 'Presentation deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Presenter',
        'toggle-presentation.label': 'Present',
        'slide-pending.label': 'Loading…',
        'add-slide.label': 'Add slide',
        'fullscreen.label': 'Fullscreen',
        'add-section.label': 'Add to presentation',
        'untitled-object.label': 'Untitled {{type}}',
        'slide-fallback.label': 'Slide {{count}}',
        'remove-section.label': 'Remove from presentation',
      },
    },
  },
] as const satisfies Theme.Resource[];
