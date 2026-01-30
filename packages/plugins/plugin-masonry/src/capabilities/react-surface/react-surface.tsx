//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { View } from '@dxos/schema';

import { MasonryContainer } from '../../components/MasonryContainer';
import { meta } from '../../meta';
import { Masonry } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: meta.id,
        role: ['article', 'section'],
        filter: (data): data is { subject: Masonry.Masonry | View.View } =>
          Obj.instanceOf(Masonry.Masonry, data.subject) || Obj.instanceOf(View.View, data.subject),
        component: ({ data, role }) => {
          const db = Obj.getDatabase(data.subject);
          const [subject] = useObject(data.subject);
          // TODO(wittjosiah): Fix this.
          // @ts-expect-error
          const [view] = useObject(Obj.instanceOf(View.View, subject) ? subject : subject.view);
          return db && view ? <MasonryContainer db={db} view={view} role={role} /> : null;
        },
      }),
    ]),
  ),
);
