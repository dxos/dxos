//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as CanvasCapabilities from '@dxos/plugin-canvas/CanvasCapabilities';
import { LinesField } from '@dxos/react-ui-canvas/scene';

import { ClassNodeView } from '#components';
import { ClassNode } from '#types';

// The class shape on the canvas: the type's definition plus its view and its list fields' editors.
const contribution: CanvasCapabilities.NodeTypeContribution = {
  type: ClassNode.TYPE,
  spec: {
    ...ClassNode.spec,
    component: ClassNodeView,
    fields: { attributes: LinesField, methods: LinesField },
  },
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(CanvasCapabilities.NodeType, contribution)),
);
