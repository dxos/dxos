//
// Copyright 2026 DXOS.org
//

import { type DialSpec } from '#model';
import type * as Protocol from '#protocol';

/**
 * Projects a dial spec onto the wire's semantic feedback shape. The device plugin owns the mapping
 * onto Elgato's touch-strip layout, so nothing here depends on their layout item names.
 */
export const renderDial = (spec: DialSpec): Protocol.DialFeedback => {
  switch (spec.kind) {
    case 'progress': {
      // Clamped here as well as in the model: `bar` is only JSON-stringified on the way out, so no
      // schema enforces the `[0, 1]` contract, and a non-finite value would serialize to `null` and
      // make the device reject the whole frame.
      const bar =
        spec.ratio === undefined || !Number.isFinite(spec.ratio) ? undefined : Math.max(0, Math.min(1, spec.ratio));
      return {
        title: spec.title,
        value: spec.detail ?? (bar === undefined ? '…' : `${Math.round(bar * 100)}%`),
        bar,
      };
    }
    case 'stat': {
      return { title: spec.title, value: spec.value };
    }
  }
};
