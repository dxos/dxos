//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';

import { TRANSCRIPTION_PLUGIN } from '../meta';
import { TranscriptionAction, TranscriptType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${TRANSCRIPTION_PLUGIN}/transcription`,
      filter: (node): node is Node<TranscriptType> => node.data instanceof TranscriptType,
      actions: () => [
        {
          id: `${TRANSCRIPTION_PLUGIN}/transcription`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(TranscriptionAction.Summarize));
          },
          properties: {
            label: ['summarize label', { ns: TRANSCRIPTION_PLUGIN }],
            icon: 'ph--book-open-text--regular',
          },
        },
      ],
    }),
  ]);
