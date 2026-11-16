//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';

import { CanvasOperation } from '#types';

import { cameraRequestAspect, parseCameraAnchor } from '../containers/CanvasArticle/view-state.ts';

/** Asks the canvas view the subject names to show the anchor's camera; the view applies it at its own size. */
const handler: Operation.WithHandler<typeof CanvasOperation.ScrollToAnchor> = CanvasOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, anchor, follow }) {
      const centre = parseCameraAnchor(anchor);
      if (!centre) {
        return;
      }
      const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
      viewState.update(cameraRequestAspect, subject, ({ seq = 0 }) => ({ centre, focus: !follow, seq: seq + 1 }));
    }),
  ),
);

export default handler;
