//
// Copyright 2025 DXOS.org
//

import { Octokit } from '@octokit/core';
import * as Effect from 'effect/Effect';

import { Operation, Script } from '@dxos/compute';

import { templates } from '../templates';
import { ScriptOperation } from '../types';

const handler: Operation.WithHandler<typeof ScriptOperation.CreateScript> = ScriptOperation.CreateScript.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, gistUrl, initialTemplateId }) {
      let source = templates[0].source;
      let scriptName = name;

      const gistId = gistUrl?.split('/').at(-1);
      if (gistId) {
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
  ),
);

export default handler;
