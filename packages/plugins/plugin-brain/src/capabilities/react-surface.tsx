//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';

import { FactsCompanion } from '../containers';
import { FACTS_NODE_DATA } from '../constants';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'facts',
        // Companion off any object article: subject is the facts sentinel, and `companionTo` carries
        // the companioned object. The sentinel-subject clause keeps this from matching primary
        // object surfaces or other companions.
        filter: AppSurface.allOf(
          AppSurface.subject(
            AppSurface.Article,
            (value): value is typeof FACTS_NODE_DATA => value === FACTS_NODE_DATA,
          ),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ data }) => (Obj.isObject(data.companionTo) ? <FactsCompanion subject={data.companionTo} /> : null),
      }),
    ]);
  }),
);
