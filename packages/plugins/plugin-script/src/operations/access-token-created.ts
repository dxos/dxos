//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { TokenManagerOperation } from '@dxos/plugin-token-manager/operations';

import { DEPLOYMENT_DIALOG } from '../constants';
import { defaultScriptsForIntegration } from '#meta';
import { templates } from '../templates';

const handler: Operation.WithHandler<typeof TokenManagerOperation.AccessTokenCreated> =
  TokenManagerOperation.AccessTokenCreated.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ accessToken }) {
        const scriptTemplates = (defaultScriptsForIntegration[accessToken.source] ?? [])
          .map((id) => templates.find((t) => t.id === id))
          .filter(Predicate.isNotNullable);

        if (scriptTemplates.length > 0) {
          yield* Operation.invoke(LayoutOperation.UpdateDialog, {
            subject: DEPLOYMENT_DIALOG,
            blockAlign: 'start',
            state: true,
            props: { accessToken, scriptTemplates },
          });
        }
      }),
    ),
  );

export default handler;
