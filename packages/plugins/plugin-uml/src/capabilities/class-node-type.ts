//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as CanvasCapabilities from '@dxos/plugin-canvas/CanvasCapabilities';
import { LinesField } from '@dxos/react-ui-canvas-editor';

import { ClassNode } from '#types';

// The class kind on the canvas: a composite object (`ClassNode.spec.template`), so the canvas draws its compartments
// as parts and the plugin contributes no view of its own — only the editors for its list fields.
const contribution: CanvasCapabilities.NodeTypeContribution = {
  type: ClassNode.TYPE,
  spec: {
    ...ClassNode.spec,
    fields: { attributes: LinesField, methods: LinesField },
  },
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(CanvasCapabilities.NodeType, contribution)),
);
