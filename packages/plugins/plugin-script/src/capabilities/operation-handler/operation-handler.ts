//
// Copyright 2025 DXOS.org
//

import { Octokit } from '@octokit/core';
import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Script } from '@dxos/functions';
import { TokenManagerOperation } from '@dxos/plugin-token-manager/types';

import { DEPLOYMENT_DIALOG } from '../../components';
import { defaultScriptsForIntegration } from '../../meta';
import { templates } from '../../templates';
import { Notebook, ScriptOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: ScriptOperation.CreateScript,
        handler: ({ name, gistUrl, initialTemplateId }) =>
          Effect.gen(function* () {
            let source = templates[0].source;
            let scriptName = name;

            const gistId = gistUrl?.split('/').at(-1);
            if (gistId) {
              // TODO(wittjosiah): Capability which contributes Octokit?
              // NOTE: AccessToken not needed to read public gists.
              const octokit = new Octokit();
              const response = yield* Effect.promise(() =>
                octokit.request('GET /gists/{gist_id}', {
                  gist_id: gistId,
                }),
              );
              const gistContent = Object.values(response.data.files ?? {})[0]?.content;
              if (gistContent) {
                source = gistContent;
              }
            }

            if (initialTemplateId) {
              const template = templates.find((template) => template.id === initialTemplateId);
              if (template) {
                source = template.source;
                scriptName = scriptName || template.name;
              }
            }

            return { object: Script.make({ name: scriptName, source }) };
          }),
      }),
      OperationResolver.make({
        operation: ScriptOperation.CreateNotebook,
        handler: ({ name }) =>
          Effect.succeed({
            object: Obj.make(Notebook.Notebook, { name, cells: [] }),
          }),
      }),
      OperationResolver.make({
        operation: TokenManagerOperation.AccessTokenCreated,
        handler: ({ accessToken }) =>
          Effect.gen(function* () {
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
            const scriptTemplates = (defaultScriptsForIntegration[accessToken.source] ?? [])
              .map((id) => templates.find((t) => t.id === id))
              .filter(Predicate.isNotNullable);

            if (scriptTemplates.length > 0) {
              yield* invoke(Common.LayoutOperation.UpdateDialog, {
                subject: DEPLOYMENT_DIALOG,
                blockAlign: 'start',
                state: true,
                props: { accessToken, scriptTemplates },
              });
            }
          }),
      }),
    ]),
  ),
);

