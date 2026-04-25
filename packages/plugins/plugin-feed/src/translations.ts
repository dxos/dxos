//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Magazine, Subscription } from '#types';

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
      [Magazine.Magazine.typename]: {
        'typename.label': 'Magazine',
        'typename.label_zero': 'Magazines',
        'typename.label_one': 'Magazine',
        'typename.label_other': 'Magazines',
        'object-name.placeholder': 'New magazine',
        'add-object.label': 'Add magazine',
        'rename-object.label': 'Rename magazine',
        'delete-object.label': 'Delete magazine',
        'object-deleted.label': 'Magazine deleted',
      },
      [meta.id]: {
        'instructions.label': 'Instructions',
        'instructions.placeholder': 'Describe what content the Magazine should gather…',
        'plugin.name': 'Feed',
        'empty-feed.message': 'No posts yet',
        'feed-companion.label': 'Feed',
        'sync-feed.label': 'Sync feed',
        'sync-feed-error.title': 'Failed to sync feed',
        'add-feed.label': 'Add feed',
        'curate.label': 'Curate',
        'syncing-feeds.label': 'Syncing feeds...',
        'curating-articles.label': 'Curating articles...',
        'no-feeds.label': 'Add at least one feed first',
        'empty-magazine.message': 'No articles yet. Add feeds and press Curate.',
        'curate-error.message': 'Failed to curate magazine.',
        'post-companion.label': 'Post',
        'post-title.placeholder': 'Untitled',
        'open-original.label': 'Open original',
        'mark-unread.label': 'Mark as unread',
        'close.label': 'Close',
      },
    },
  },
] as const satisfies Resource[];
