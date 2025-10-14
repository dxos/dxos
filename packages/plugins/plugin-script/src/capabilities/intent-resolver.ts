//
// Copyright 2025 DXOS.org
//

import { Octokit } from '@octokit/core';
import * as Predicate from 'effect/Predicate';

import { Capabilities, LayoutAction, contributes, createIntent, createResolver } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { TokenManagerAction } from '@dxos/plugin-token-manager/types';
import { DataType } from '@dxos/schema';

import { DEPLOYMENT_DIALOG } from '../components';
import { defaultScriptsForIntegration } from '../meta';
import { templates } from '../templates';
import { Notebook, ScriptAction } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: ScriptAction.CreateScript,
      resolve: async ({ name, gistUrl, initialTemplateId }) => {
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

        if (initialTemplateId) {
          const template = templates.find((template) => template.id === initialTemplateId);
          if (template) {
            content = template.source;
            name = template.name;
          }
        }

        return {
          data: {
            object: Obj.make(ScriptType, { name, source: Ref.make(DataType.makeText(content)) }),
          },
        };
      },
    }),
    createResolver({
      intent: ScriptAction.CreateNotebook,
      resolve: async ({ name }) => {
        return {
          data: {
            object: Obj.make(Notebook.Notebook, { name, cells: [] }),
          },
        };
      },
    }),
    createResolver({
      intent: TokenManagerAction.AccessTokenCreated,
      resolve: async ({ accessToken }) => {
        const scriptTemplates = (defaultScriptsForIntegration[accessToken.source] ?? [])
          .map((id) => templates.find((t) => t.id === id))
          .filter(Predicate.isNotNullable);

        if (scriptTemplates.length > 0) {
          return {
            intents: [
              createIntent(LayoutAction.UpdateDialog, {
                part: 'dialog',
                subject: DEPLOYMENT_DIALOG,
                options: { blockAlign: 'start', state: true, props: { accessToken, scriptTemplates } },
              }),
            ],
          };
        }

        return { data: undefined };
      },
    }),
  ]);
