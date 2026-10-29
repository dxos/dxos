//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Obj } from '@dxos/echo';

import { ProjectCapabilities, Spec, SpecText } from '#types';

/** A spec's document is written to its file with each feature as its `feat` block, and read back as embeds. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(ProjectCapabilities.SpecDocumentCodec, {
      write: async (document, { base }) => {
        const spec = Obj.getParent(document);
        return Spec.instanceOf(spec) ? SpecText.expand(spec, { base }) : undefined;
      },
      read: async (document, text, { path }) => {
        const spec = Obj.getParent(document);
        if (!Spec.instanceOf(spec)) {
          return false;
        }
        await SpecText.take(spec, { path, text });
        return true;
      },
    }),
  ),
);
