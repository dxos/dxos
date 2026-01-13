//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useLayout } from '@dxos/app-framework/react';
import { parseId, useDatabase } from '@dxos/react-client/echo';

import { TokensContainer } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: string } => data.subject === `${meta.id}/space-settings`,
        component: () => {
          const layout = useLayout();
          const { spaceId } = parseId(layout.workspace);
          const db = useDatabase(spaceId);

          if (!db) {
            return null;
          }

          return <TokensContainer db={db} />;
        },
      }),
    ]),
  ),
);
