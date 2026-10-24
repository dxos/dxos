//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { LAYOUT_SLOTS, LAYOUTS, SlideFrontmatter } from '#markdown';
import { PresenterOperation } from '#types';

const handler: Operation.WithHandler<typeof PresenterOperation.ListLayouts> = PresenterOperation.ListLayouts.pipe(
  Operation.withHandler(() =>
    Effect.succeed({
      // The first region takes the content before any marker, so only the later regions have one.
      layouts: LAYOUTS.map((name) => ({
        name,
        slots: (LAYOUT_SLOTS[name] ?? []).slice(1).map((slot) => `::${slot}::`),
      })),
      frontmatter: Object.keys(SlideFrontmatter.fields),
    }),
  ),
);

export default handler;
