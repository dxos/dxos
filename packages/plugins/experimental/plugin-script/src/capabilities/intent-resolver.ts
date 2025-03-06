//
// Copyright 2025 DXOS.org
//

import { Octokit } from '@octokit/core';

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { ScriptType } from '@dxos/functions';
import { create, makeRef } from '@dxos/live-object';
import { TextType } from '@dxos/schema';

import { templates } from '../templates';
import { ScriptAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ScriptAction.Create,
      resolve: async ({ name, gistUrl }) => {
        let content = templates[0].source;
        const gistId = gistUrl?.split('/').at(-1);
        if (gistId) {
          // TODO(wittjosiah): Capability which contributes Octokit?
          // NOTE: AccessToken not needed to read public gists.
          const octokit = new Octokit();
          const response = await octokit.request('GET /gists/{gist_id}', {
            gist_id: gistId,
          });
          const gistContent = Object.values(response.data.files ?? {})[0]?.content;
          if (gistContent) {
            content = gistContent;
          }
        }

        return {
          data: {
            object: create(ScriptType, {
              name,
              source: makeRef(create(TextType, { content })),
            }),
          },
        };
      },
    }),
  );
