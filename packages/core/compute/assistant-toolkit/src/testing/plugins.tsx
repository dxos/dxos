//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { DXN, Format, type Obj, Type } from '@dxos/echo';
import { Card } from '@dxos/react-ui';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';

const CardContent: Surface.RoleToken<any> = Surface.makeType('org.dxos.role.cardContent');

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

// TODO(dmaretskyi): Removed images from conductor GPT implementation.
const isImage = (data: any): data is any => false;

export const capabilities: Capability.Any[] = [
  Capability.contributes(
    Capabilities.ReactSurface,
    Surface.create({
      id: 'pluginImage',
      filter: Surface.makeFilter(CardContent, (data: any): data is any => isImage((data as any).value)),
      component: ({ data }) => (
        <Card.Body>
          <img
            className='grow object-cover'
            src={`data:image/jpeg;base64,${data.value.source.data}`}
            alt={data.value.prompt ?? `Generated image [id=${data.value.id}]`}
          />
        </Card.Body>
      ),
    }),
  ),
  Capability.contributes(
    Capabilities.ReactSurface,
    Surface.create({
      id: 'pluginDefault',
      filter: Surface.makeFilter(CardContent),
      position: 'last',
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
