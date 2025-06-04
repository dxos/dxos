//
// Copyright 2025 DXOS.org
//

import { Octokit } from '@octokit/core';
import { Predicate } from 'effect';

import {
  contributes,
  Capabilities,
  createResolver,
  createIntent,
  LayoutAction,
  type PluginContext,
} from '@dxos/app-framework';
import { getInvocationUrl, getUserFunctionUrlInMetadata, ScriptType } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { getMeta, live, makeRef } from '@dxos/live-object';
import { ClientCapabilities } from '@dxos/plugin-client';
import { TokenManagerAction } from '@dxos/plugin-token-manager/types';
import { getSpace } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { DEPLOYMENT_DIALOG } from '../components';
import { defaultScriptsForIntegration } from '../meta';
import { templates } from '../templates';
import { ScriptAction } from '../types';
import { deployScript } from '../util';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: ScriptAction.Create,
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
            object: live(ScriptType, {
              name,
              source: makeRef(live(DataType.Text, { content })),
            }),
          },
        };
      },
    }),
    createResolver({
      intent: ScriptAction.Deploy,
      resolve: async ({ object: script }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const space = getSpace(script);
        invariant(space);

        const result = await deployScript({ script, client, space });
        if (result.error) {
          return { error: result.error };
        }

        const object = result.storedFunction;
        invariant(object, 'Function not found');
        return { data: { object } };
      },
    }),
    createResolver({
      intent: ScriptAction.Invoke,
      resolve: async ({ object: fn, data, space }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const edgeUrl = client.config.values.runtime?.services?.edge?.url;
        invariant(edgeUrl, 'Edge URL not found');
        const existingFunctionUrl = getUserFunctionUrlInMetadata(getMeta(fn));
        invariant(existingFunctionUrl, 'Function URL not found');
        const url = getInvocationUrl(existingFunctionUrl, edgeUrl, { spaceId: space?.id });
        const response = await fetch(url, {
          method: 'POST',
          body: data,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return { data: await response.json() };
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
