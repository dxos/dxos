//
// Copyright 2025 DXOS.org
//

import { Octokit } from '@octokit/core';

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { Filter } from '@dxos/client/echo';
import { ScriptType } from '@dxos/functions';
import { create, makeRef } from '@dxos/live-object';
import { AccessTokenType, TextType } from '@dxos/schema';

import { templates } from '../templates';
import { ScriptAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(ScriptAction.Create, async ({ name, gistUrl, space }) => {
      let content = templates[0].source;
      const gistId = gistUrl?.split('/').at(-1);
      if (gistId) {
        const {
          objects: [githubToken],
        } = await space.db.query(Filter.schema(AccessTokenType, { source: 'github.com' })).run();
        if (githubToken) {
          // TODO(wittjosiah): Capability which contributes Octokit?
          const octokit = new Octokit({ auth: githubToken.token });
          const response = await octokit.request('GET /gists/{gist_id}', {
            gist_id: gistId,
          });
          const gistContent = Object.values(response.data.files ?? {})[0]?.content;
          if (gistContent) {
            content = gistContent;
          }
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
    }),
  );
