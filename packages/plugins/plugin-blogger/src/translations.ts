//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Blog } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Blog.Publication)]: {
        'typename.label': 'Publication',
        'typename.label_zero': 'Publications',
        'typename.label_one': 'Publication',
        'typename.label_other': 'Publications',
        'object-name.placeholder': 'New publication',
        'add-object.label': 'Add publication',
      },
      [Type.getTypename(Blog.Post)]: {
        'typename.label': 'Post',
        'typename.label_zero': 'Posts',
        'typename.label_one': 'Post',
        'typename.label_other': 'Posts',
        'object-name.placeholder': 'New post',
        'add-object.label': 'Add post',
      },
      [meta.profile.key]: {
        'plugin.name': 'Blog',
        'publications.label': 'Publications',
        'post-card.untitled.label': 'Untitled post',
        'post-card.drafts.label_one': '{{count}} draft',
        'post-card.drafts.label_other': '{{count}} drafts',
        'gallery-view.label': 'Gallery view',
        'instructions-view.label': 'Instructions view',
        'add-post.label': 'Add post',
        'drafts-tabs.menu': 'Drafts',
        'add-draft.label': 'Add draft',
        'publish.label': 'Publish',
        'import.label': 'Import',
        'delete.label': 'Delete publication',
      },
    },
  },
] as const satisfies Resource[];
