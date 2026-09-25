//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { BoardLayout, type CellLayout, defaultLayout } from '@dxos/react-ui-board/types';

import * as MediaArtifact from './MediaArtifact.ts';

/**
 * A spatial "lightbox" view over a set of {@link MediaArtifact}s laid out on a board grid. Layout is a
 * *view* concern (reuses `react-ui-board`'s `BoardLayout`), distinct from a `Collection` (masonry) of
 * the same artifacts — the artifacts are referenced, not owned.
 */
export class Lightbox extends Type.makeObject<Lightbox>(DXN.make('org.dxos.type.lightbox', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    items: Schema.Array(Ref.Ref(MediaArtifact.MediaArtifact)).pipe(Annotation.FormInputAnnotation.set(false)),
    layout: BoardLayout.pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--squares-four--regular', hue: 'indigo' }),
    Annotation.UserType.set(),
  ),
) {}

export type MakeProps = {
  [Obj.Parent]?: Obj.Unknown;
  name?: string;
};

/** Creates an empty {@link Lightbox} with the default board layout. */
export const make = (props: MakeProps = {}): Lightbox =>
  Obj.make(Lightbox, { [Obj.Parent]: props[Obj.Parent], name: props.name, items: [], layout: defaultLayout });

/** A cell as the first lightbox writer persisted it: spans under `width`/`height`, not `w`/`h`. */
const LegacyCellLayout = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.optional(Schema.Number),
  height: Schema.optional(Schema.Number),
});

const decodeLegacyCell = Schema.decodeUnknownOption(LegacyCellLayout);

/**
 * The lightbox's cells with any legacy `width`/`height` spans carried to `w`/`h`, so the free-cell
 * search and the board see a 2×2 cell as 2×2 rather than the default 1×1.
 */
export const cells = (layout?: Lightbox['layout']): Record<string, CellLayout> =>
  Object.fromEntries(
    Object.entries(layout?.cells ?? {}).map(([id, cell]) => {
      if (cell.w !== undefined || cell.h !== undefined) {
        return [id, cell];
      }
      const legacy = decodeLegacyCell(cell);
      return [
        id,
        legacy._tag === 'Some' ? { x: cell.x, y: cell.y, w: legacy.value.width, h: legacy.value.height } : cell,
      ];
    }),
  );
