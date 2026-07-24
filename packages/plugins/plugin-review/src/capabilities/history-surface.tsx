//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Markdown } from '@dxos/plugin-markdown/types';

import { ObjectHistory } from '#containers';

import { MarkdownProperties } from '../components';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'companion.objectHistory',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'history'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data, role, ref }) => (
          <ObjectHistory role={role} attendableId={data.attendableId} subject={data.companionTo} ref={ref} />
        ),
      }),
      Surface.create({
        id: 'surface.markdownProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Markdown.Document),
        component: ({ data, role }) => <MarkdownProperties role={role} subject={data.subject} />,
      }),
    ]);
  }),
);
