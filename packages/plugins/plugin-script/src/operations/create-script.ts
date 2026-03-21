//
// Copyright 2025 DXOS.org
//

import { Octokit } from '@octokit/core';
import * as Effect from 'effect/Effect';

import { Script } from '@dxos/functions';
import { Operation } from '@dxos/operation';

import { templates } from '../templates';
import { CreateScript } from './definitions';

export default CreateScript.pipe(
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
