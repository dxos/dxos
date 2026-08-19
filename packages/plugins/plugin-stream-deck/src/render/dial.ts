//
// Copyright 2026 DXOS.org
//

import { type DialSpec } from '#model';
import { type Protocol } from '#protocol';

/**
 * Projects a dial spec onto the wire's semantic feedback shape. The device plugin owns the mapping
 * onto Elgato's touch-strip layout, so nothing here depends on their layout item names.
 */
export const renderDial = (spec: DialSpec): Protocol.DialFeedback => {
  switch (spec.kind) {
    case 'progress': {
      return {
        title: spec.title,
        value: spec.detail ?? (spec.ratio === undefined ? '…' : `${Math.round(spec.ratio * 100)}%`),
        bar: spec.ratio,
      };
    }
    case 'stat': {
      return { title: spec.title, value: spec.value };
    }
  }
};
