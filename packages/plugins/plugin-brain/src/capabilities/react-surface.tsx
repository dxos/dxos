//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Topic } from '@dxos/compute';

import { FactsCompanion, TopicArticle } from '#containers';
import { BrainSurface } from '#types';

/** React surfaces contributed by plugin-brain — the per-space facts panel and the Topic detail article. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'brain.facts',
        filter: Surface.makeFilter(BrainSurface.Facts),
        component: () => <FactsCompanion />,
      }),
      Surface.create({
        id: 'brain.topic',
        filter: AppSurface.object(AppSurface.Article, Topic.Topic),
        component: ({ data, role }) => <TopicArticle role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
