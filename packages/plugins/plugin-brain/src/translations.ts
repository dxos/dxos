//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { Topic } from '@dxos/types';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Topic.Topic)]: {
        'typename.label': 'Topic',
        'typename.label_zero': 'Topics',
        'typename.label_one': 'Topic',
        'typename.label_other': 'Topics',
        'object-name.placeholder': 'New topic',
        'rename-object.label': 'Rename topic',
        'delete-object.label': 'Delete topic',
        'object-deleted.label': 'Topic deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Brain',
        'topic.label': 'Topic',
        'topics.label': 'Topics',
        'topic.threads.label': 'Threads',
        'topic.questions.label': 'Questions',
        'topic.tasks.label': 'Tasks',
      },
    },
  },
] as const satisfies Resource[];
