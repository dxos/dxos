//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Type } from '@dxos/echo';
import { isSpace } from '@dxos/react-client/echo';
import { Organization, Person } from '@dxos/types';
import { Position } from '@dxos/util';

import { CollectionArticle } from '#containers';

/** Typenames whose collection nodes render the CRM layout-switching article. */
const CRM_TYPENAMES = new Set([Type.getTypename(Organization.Organization), Type.getTypename(Person.Person)]);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'crmCollection',
        // Takes precedence over plugin-space's generic type-collection article for CRM types.
        position: Position.first,
        filter: AppSurface.subject(
          AppSurface.Article,
          (subject): subject is Type.AnyEntity => Type.isType(subject) && CRM_TYPENAMES.has(Type.getTypename(subject)),
        ),
        component: ({ data, role }) => {
          const space = isSpace(data.properties?.space) ? data.properties.space : undefined;
          if (!space) {
            return null;
          }

          return <CollectionArticle role={role} space={space} type={data.subject} attendableId={data.attendableId} />;
        },
      }),
    ]);
  }),
);
