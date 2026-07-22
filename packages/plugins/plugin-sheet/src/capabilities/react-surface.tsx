//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';

import { RangeList, SheetArticle } from '#containers';
import { Sheet, SheetCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'sheet',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Sheet.Sheet, (data) => !!Obj.getDatabase(data.subject)),
          AppSurface.object(AppSurface.Section, Sheet.Sheet, (data) => !!Obj.getDatabase(data.subject)),
        ),
        component: ({ data, role }) => {
          const computeGraphRegistry = useCapability(SheetCapabilities.ComputeGraphRegistry);

          return (
            <SheetArticle
              role={role}
              subject={data.subject}
              attendableId={data.attendableId}
              space={getSpace(data.subject)!}
              registry={computeGraphRegistry}
            />
          );
        },
      }),
      Surface.create({
        id: 'objectProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Sheet.Sheet),
        component: ({ data }) => <RangeList sheet={data.subject} />,
      }),
    ]),
  ),
);
