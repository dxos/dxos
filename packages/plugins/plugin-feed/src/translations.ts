//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Subscription } from './types';

export const translations = [
  {
    'en-US': {
      [Subscription.Feed.typename]: {
        'typename.label': 'Feed',
        'typename.label_zero': 'Feeds',
        'typename.label_one': 'Feed',
        'typename.label_other': 'Feeds',
        'object-name.placeholder': 'New feed',
        'add-object.label': 'Add feed',
        'rename-object.label': 'Rename feed',
        'delete-object.label': 'Delete feed',
        'object-deleted.label': 'Feed deleted',
      },
      [Subscription.Post.typename]: {
        'typename.label': 'Post',
        'typename.label_zero': 'Posts',
        'typename.label_one': 'Post',
        'typename.label_other': 'Posts',
        'post-title.placeholder': 'Untitled',
      },
      [meta.id]: {
        'plugin.name': 'Feed',
        'empty-feed.message': 'No posts yet',
        'feed-companion.label': 'Feed',
        'sync-feed.label': 'Sync feed',
        'sync-feed-error.title': 'Failed to sync feed',
        'add-feed.label': 'Add feed',
      },
    },
  },
] as const satisfies Resource[];
