//
// Copyright 2024 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Channel, Video } from './types';

export const translations = [
  {
    'en-US': {
      [Channel.YouTubeChannel.typename]: {
        'typename.label': 'YouTube Channel',
        'typename.label_zero': 'YouTube Channels',
        'typename.label_one': 'YouTube Channel',
        'typename.label_other': 'YouTube Channels',
        'object-name.placeholder': 'New YouTube channel',
        'add-object.label': 'Add YouTube channel',
        'rename-object.label': 'Rename YouTube channel',
        'delete-object.label': 'Delete YouTube channel',
        'object-deleted.label': 'YouTube channel deleted',
      },
      [Video.YouTubeVideo.typename]: {
        'typename.label': 'Video',
        'typename.label_zero': 'Videos',
        'typename.label_one': 'Video',
        'typename.label_other': 'Videos',
        'object-name.placeholder': 'New video',
        'add-object.label': 'Add video',
        'rename-object.label': 'Rename video',
        'delete-object.label': 'Delete video',
        'object-deleted.label': 'Video deleted',
      },
      [meta.id]: {
        'plugin.name': 'YouTube',
        'channel.label': 'YouTube Channel',
        'video.label': 'Video',
        'sync-channel.label': 'Sync channel',
        'sync-channel-error.title': 'Failed to sync channel',
        'clear-synced-videos.label': 'Clear synced videos',
        'clear-synced-videos-error.title': 'Failed to clear synced videos',
        'close.label': 'Close',
        'new-channel.label': 'New YouTube Channel',
        'empty-channel.message': 'No videos synced yet',
        'no-video.message': 'Select a video to view it',

        'channel-account.label': 'Account',
        'channel-account.placeholder': 'Select account...',
        'channel-sync.label': 'Channel Sync',

        'enable-background-sync.label': 'Enable background sync',
        'enabling-background-sync.label': 'Enabling...',
        'disable-background-sync.label': 'Disable background sync',
        'view-trigger.label': 'View trigger',
      },
    },
  },
] as const satisfies Resource[];
