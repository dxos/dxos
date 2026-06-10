//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Video } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Video.Video)]: {
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
        'plugin.name': 'Video',
        'transcribe.label': 'Transcribe',
        'fetch-description.label': 'Fetch description',
        'fetch-description-error.message': 'Failed to fetch description.',
        'fetch-transcript.label': 'Fetch transcript (captions)',
        'fetch-transcript-error.message': 'Failed to fetch transcript from captions.',
        'transcribe-error.message': 'Transcription failed.',
        'transcribe-retry.label': 'Retry',
        'summarize.label': 'Summarize',
        'summarize-error.message': 'Summarization failed.',
        'open-transcript.label': 'Open transcript',
        'open-original.label': 'Open original',
        'transcript.tab.label': 'Transcript',
        'summary.tab.label': 'Summary',
        'no-url.pending.label': 'Set a video URL to generate a transcript.',
        'transcribing.pending.label': 'Generating transcript…',
        'summarizing.pending.label': 'Generating summary…',
        'regenerate.label': 'Regenerate summary',
        'player.empty.label': 'Set a video URL to play.',
      },
    },
  },
] as const satisfies Resource[];
