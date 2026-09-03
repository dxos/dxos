//
// Copyright 2026 DXOS.org
//

import { Store } from '@tldraw/store';
import {
  DocumentRecordType,
  PageRecordType,
  TLDOCUMENT_ID,
  type TLRecord,
  createTLSchema,
  geoShapeMigrations,
  geoShapeProps,
} from '@tldraw/tlschema';
import { type IndexKey } from '@tldraw/utils';
import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Tldraw from '@dxos/plugin-tldraw/Tldraw';

//
// Sketches — tldraw v3 store format
//
// Records are created via the @tldraw/tlschema + @tldraw/store API so the
// canvas content is always in the exact format the installed tldraw version
// expects. @tldraw/tlschema and @tldraw/store have no DOM dependencies and
// work fine in Node.js.
//
// ⚠️  tldraw v3 IndexKey rules (fractional indexing):
//   - Every shape and page needs an `index` field that is a valid IndexKey.
//   - Valid format: one or more lowercase letters followed by digits/alphanumeric
//     (e.g. 'a1', 'a2', 'a9', 'a10', 'a1J', 'b0V').
//   - INVALID: single-letter keys like 'a', 'b'; or bare-letter-then-digit
//     patterns that don't survive fractional-index round-trips like 'b1', 'b2'.
//     These look reasonable but throw at `store.put()` time:
//       ValidationError: At shape(type = geo).index: Expected an index key, got "b2"
//   - Safe rule: use 'a1', 'a2', … 'a9', 'a10', 'a11', … for sequential shapes
//     on a single page.  Never use 'b1', 'b2', etc. as a "next row".
//   - The error is silently swallowed by plugin-tldraw's useAsyncEffect, so a
//     bad index key results in an empty canvas with no console error in the UI.
//   - Upstream reference: packages/plugins/plugin-tldraw/src/hooks/useStoreAdapter.ts
//

// Minimal tldraw v3 schema with geo shapes only.
const tlSchema = createTLSchema({
  shapes: { geo: { props: geoShapeProps, migrations: geoShapeMigrations } },
});

/**
 * Create a tldraw v3 canvas content map seeded with the given geo shapes.
 * Returns a flat record map (`{ [id: string]: TLRecord }`) compatible with
 * the Canvas.content ECHO field.
 */
const makeTLCanvas = (pageId: string, pageName: string, shapes: TLRecord[]): Record<string, unknown> => {
  const store = new Store<TLRecord, any>({
    schema: tlSchema as any,
    props: { defaultName: '', assets: { upload: async () => '', resolve: () => '' }, onMount: () => {} } as any,
  });
  store.put(
    [
      DocumentRecordType.create({ id: TLDOCUMENT_ID }),
      PageRecordType.create({ id: pageId as any, name: pageName, index: 'a1' as IndexKey }),
      ...shapes,
    ],
    'initialize',
  );
  return store.serialize('document') as Record<string, unknown>;
};

/**
 * Build a geo shape record.
 *
 * @param id   - Shape ID suffix (prefixed with `shape:`).
 * @param page - Parent page ID (e.g. `'page:bramble-floor'`).
 * @param idx  - Fractional-index key. Use 'a1', 'a2', … 'a9', 'a10', 'a11', …
 *   for sequential shapes. Do NOT use 'b1', 'b2', etc. — those fail tldraw v3
 *   IndexKey validation and silently produce an empty canvas in the UI.
 */
const tlGeo = (
  id: string,
  page: string,
  idx: string,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  color: string,
  fill: string,
): TLRecord =>
  ({
    typeName: 'shape',
    id: `shape:${id}`,
    type: 'geo',
    x,
    y,
    rotation: 0,
    index: idx as IndexKey,
    parentId: page,
    isLocked: false,
    opacity: 1,
    meta: {},
    props: {
      w,
      h,
      geo: 'rectangle',
      color,
      labelColor: 'black',
      fill,
      dash: 'draw',
      size: 'm',
      font: 'draw',
      text,
      align: 'middle',
      verticalAlign: 'middle',
      growY: 0,
      url: '',
      scale: 1,
    },
  }) as unknown as TLRecord;

const makeFloorPlanContent = (): Record<string, unknown> => {
  const PAGE = 'page:bramble-floor';
  const g = (
    id: string,
    idx: string,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    color: string,
    fill: string,
  ) => tlGeo(id, PAGE, idx, x, y, w, h, text, color, fill);

  return makeTLCanvas(PAGE, 'Roastery Floor Plan', [
    // Outer boundary (no label — the sketch name serves as the title)
    g('fp-outer', 'a1', 0, 0, 800, 580, '', 'black', 'none'),
    // Loading dock (top strip)
    g('fp-dock', 'a2', 20, 20, 760, 80, 'Loading Dock', 'grey', 'semi'),
    // Green coffee storage (left middle)
    g('fp-storage', 'a3', 20, 120, 220, 200, 'Green Coffee\nStorage', 'green', 'semi'),
    // Roasting bay (right/center middle)
    g('fp-roasting', 'a4', 260, 120, 520, 200, 'Roasting Bay', 'orange', 'semi'),
    // Packaging (left lower)
    g('fp-packaging', 'a5', 20, 340, 220, 120, 'Packaging', 'light-blue', 'semi'),
    // Café bar (right lower)
    g('fp-cafe', 'a6', 260, 340, 520, 120, 'Café Bar', 'yellow', 'semi'),
    // Retail & tasting counter (bottom strip)
    g('fp-retail', 'a7', 20, 480, 760, 80, 'Retail & Tasting Counter', 'violet', 'semi'),
  ]);
};

// Spring Blend Flavor Wheel — 4-column rectangle grid.
// Each column is one flavor family (Fruit / Chocolate / Floral / Spice);
// rows beneath each header list the specific tasting notes.
//
// Layout:
//   Row 0 (y=0,   h=60): full-width title bar
//   Row 1 (y=80,  h=80): 4 category headers, colored fill
//   Row 2 (y=180, h=60): first tasting note per category
//   Row 3 (y=260, h=60): second tasting note per category
//   Column width: 180 px, gap 10 px  →  total canvas: 750 × 320 px
const makeFlavorWheelContent = (): Record<string, unknown> => {
  const PAGE = 'page:flavor-wheel';
  const COL_W = 180;
  const COL_GAP = 10;
  const g = (
    id: string,
    idx: string,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    color: string,
    fill: string,
  ) => tlGeo(id, PAGE, idx, x, y, w, h, text, color, fill);

  const x = (col: number) => col * (COL_W + COL_GAP);

  return makeTLCanvas(PAGE, 'Spring Blend Flavor Wheel', [
    // Row 0: title
    g('fw-title', 'a1', 0, 0, x(3) + COL_W, 60, 'Spring Blend — Flavor Profile', 'black', 'semi'),
    // Row 1: category headers
    g('fw-cat-fruit', 'a2', x(0), 80, COL_W, 80, 'Fruit', 'red', 'semi'),
    g('fw-cat-choc', 'a3', x(1), 80, COL_W, 80, 'Chocolate', 'orange', 'semi'),
    g('fw-cat-floral', 'a4', x(2), 80, COL_W, 80, 'Floral', 'violet', 'semi'),
    g('fw-cat-spice', 'a5', x(3), 80, COL_W, 80, 'Spice', 'yellow', 'semi'),
    // Row 2: first tasting note per family
    g('fw-n1-fruit', 'a6', x(0), 180, COL_W, 60, 'Berry', 'red', 'none'),
    g('fw-n1-choc', 'a7', x(1), 180, COL_W, 60, 'Dark Cacao', 'orange', 'none'),
    g('fw-n1-floral', 'a8', x(2), 180, COL_W, 60, 'Jasmine', 'violet', 'none'),
    g('fw-n1-spice', 'a9', x(3), 180, COL_W, 60, 'Cardamom', 'yellow', 'none'),
    // Row 3: second tasting note per family
    g('fw-n2-fruit', 'a10', x(0), 260, COL_W, 60, 'Stone Fruit', 'red', 'none'),
    g('fw-n2-choc', 'a11', x(1), 260, COL_W, 60, 'Hazelnut', 'orange', 'none'),
    g('fw-n2-floral', 'a12', x(2), 260, COL_W, 60, 'Rose', 'violet', 'none'),
    g('fw-n2-spice', 'a13', x(3), 260, COL_W, 60, 'Cinnamon', 'yellow', 'none'),
  ]);
};

const makeSketches = (): { floorPlan: Drawing.Drawing; flavorWheel: Drawing.Drawing } => ({
  floorPlan: Drawing.make({
    name: 'Roastery floor plan',
    canvas: Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content: makeFloorPlanContent() }),
  }),
  flavorWheel: Drawing.make({
    name: 'Spring blend flavor wheel',
    canvas: Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA, content: makeFlavorWheelContent() }),
  }),
});

/** The roastery floor plan and the Spring Blend flavour wheel, as tldraw canvases. */
export type DrawingsResult = { floorPlan: Drawing.Drawing; flavorWheel: Drawing.Drawing };

export const Drawings: SampleSpace.Phase<DrawingsResult> = SampleSpace.phase('drawings', {
  schemas: [Drawing.Drawing, Drawing.Canvas],
  run: () =>
    Effect.gen(function* () {
      const drawings = makeSketches();
      for (const drawing of Object.values(drawings)) {
        yield* Database.add(drawing);
      }
      return drawings;
    }),
});
