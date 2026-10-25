//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, EID, Obj, Ref } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetRange from '@dxos/plugin-sheet/SheetRange';
import * as SheetUtil from '@dxos/plugin-sheet/SheetUtil';

import presentation from '../../../assets/presenter/presentation.md?raw';
import timelineJson from '../../../assets/presenter/timeline.json?raw';

/** Technology, macro and personal events, one per row under a header: date, category, title, description, image. */
type Timeline = {
  order: string[];
  colors: Record<string, string>;
  rows: (string | number | null)[][];
};

const timeline: Timeline = JSON.parse(timelineJson);

/** Where the deck embeds the timeline chart. */
const TIMELINE_PLACEHOLDER = '{{timeline}}';

/** The description column is wide enough to read a sentence. */
const DESCRIPTION_COLUMN_SIZE = 540;

/** The chart opens on Tech and Personal; the macro categories are a tag click away. */
const HIDDEN = ['Macro', 'Macro/FIC', 'Macro/TIC', 'Macro/MIC'];

export type Provides = {
  sheet: Sheet.Sheet;
  chart: Sheet.Chart;
  deck: Markdown.Document;
};

/** The events sheet with its macro timeline chart. */
export const makeEvents = (): { sheet: Sheet.Sheet; chart: Sheet.Chart } => {
  const sheet = Sheet.make({
    name: 'Macro events',
    rows: timeline.rows.length + 20,
    columns: 5,
    cells: SheetUtil.cellsFromRows(timeline.rows),
    ranges: [{ range: 'A1:E1', key: SheetRange.styleKey, value: 'header' }],
    charts: [
      {
        name: 'Macro timeline',
        range: `A1:E${timeline.rows.length}`,
        type: 'timeline',
        header: true,
        timeline: { start: '1940', end: '2030', order: timeline.order, colors: timeline.colors, hidden: HIDDEN },
      },
    ],
  });
  Obj.update(sheet, (sheet) => {
    sheet.columnMeta[sheet.columns[3]] = { size: DESCRIPTION_COLUMN_SIZE };
  });
  const chart = sheet.charts?.[0]?.target;
  if (!chart) {
    throw new Error('Macro timeline chart was not created.');
  }
  return { sheet, chart };
};

/** The deck from `assets/presenter/presentation.md`, with the timeline chart's EID in place of its placeholder. */
const makeDeck = (chart: Sheet.Chart): Markdown.Document =>
  Markdown.make({
    name: 'Macro',
    content: presentation.replaceAll(TIMELINE_PLACEHOLDER, EID.make({ entityId: chart.id })),
  });

/** The macro events sheet, its timeline chart and a deck that presents them. */
export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('macro', {
  schemas: [Sheet.Sheet, Sheet.Chart, Markdown.Document],
  run: () =>
    Effect.gen(function* () {
      const { sheet: events, chart } = makeEvents();
      const sheet = yield* Database.add(events);
      const deck = yield* Database.add(makeDeck(chart));
      yield* SampleSpace.collection('Macro', [Ref.make(deck), Ref.make(sheet)]);
      return { sheet, chart, deck };
    }),
});
