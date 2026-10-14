//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { CanvasProperties } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'surface.objectProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Drawing.Drawing),
        component: CanvasProperties,
        props: ({ data: { subject } }) => ({ drawing: subject }),
      }),
    ]),
  ),
);
