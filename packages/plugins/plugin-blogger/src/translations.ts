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
        'post-card.status.draft.label': 'Draft',
        'post-card.status.published.label': 'Published',
        'gallery-view.label': 'Gallery view',
        'instructions-view.label': 'Instructions view',
        'add-post.label': 'Add post',
        'sync.label': 'Sync',
        'delete.label': 'Delete publication',
        'delete-publication-dialog.title': 'Delete publication?',
        'delete-publication-dialog.description':
          'This removes the publication from the space. Its posts are not deleted.',
        'delete-publication-dialog.confirm.label': 'Delete',
        'cancel.label': 'Cancel',
        'comments.label': 'Comments',
      },
    },
  },
] as const satisfies Resource[];
