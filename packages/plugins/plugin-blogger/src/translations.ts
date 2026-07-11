//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Blogger } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Blogger.Publication)]: {
        'typename.label': 'Publication',
        'typename.label_zero': 'Publications',
        'typename.label_one': 'Publication',
        'typename.label_other': 'Publications',
        'object-name.placeholder': 'New publication',
        'add-object.label': 'Add publication',
      },
      [Type.getTypename(Blogger.Post)]: {
        'typename.label': 'Post',
        'typename.label_zero': 'Posts',
        'typename.label_one': 'Post',
        'typename.label_other': 'Posts',
        'object-name.placeholder': 'New post',
        'add-object.label': 'Add post',
      },
      [meta.profile.key]: {
        'plugin.name': 'Blogger',
        'publications.label': 'Publications',
        'post-card.untitled.label': 'Untitled post',
        'post-card.drafts.label_one': '{{count}} draft',
        'post-card.drafts.label_other': '{{count}} drafts',
      },
    },
  },
] as const satisfies Resource[];
