//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { DXN, Format, type Obj, Type } from '@dxos/echo';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import * as Card from '@dxos/react-ui/Card';
import * as Position from '@dxos/util/Position';

export const MapSchema = Schema.Struct({
  coordinates: Format.GeoPoint,
}).pipe(Type.makeObject(DXN.make('com.example.type.map', '0.1.0')));

export type MapSchema = Type.InstanceType<typeof MapSchema>;

// TODO(burdon): Move to ECHO def.
export type ArtifactsContext = {
  items: Obj.Unknown[];
  getArtifacts: () => Obj.Unknown[];
  addArtifact: (artifact: Obj.Unknown) => void;
};

declare global {
  interface ToolContextExtensions {
    artifacts?: ArtifactsContext;
  }
}

export const capabilities: Capability.AnyContribution[] = [
  Capability.contribute(
    Capabilities.ReactSurface,
    Surface.Root.create({
      id: 'pluginDefault',
      filter: Surface.Root.makeFilter(AppSurface.CardContent),
      position: Position.last,
      component: ({ data }) => (
        <Card.Body>
          <Syntax.Root data={data}>
            <Syntax.Content>
              <Syntax.Filter />
              <Syntax.Viewport>
                <Syntax.Code />
              </Syntax.Viewport>
            </Syntax.Content>
          </Syntax.Root>
        </Card.Body>
      ),
    }),
  ),
];
