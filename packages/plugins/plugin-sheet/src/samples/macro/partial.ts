//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, EID, Obj, Ref } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { technologyTimeline, technologyTimelineColors, technologyTimelineOrder } from '@dxos/react-ui-plot/testing';

import { Sheet, SheetRange } from '#types';

import { COMPLEXES, toCells } from './data.ts';

/** The description column is wide enough to read a sentence. */
const DESCRIPTION_COLUMN_SIZE = 540;

/** Categories outside the macro view; the sheet keeps them so the chart can show them too. */
const HIDDEN = ['Tech/Hardware', 'Tech/Software', 'Tech/AI', 'Personal'];

export type Provides = {
  sheet: Sheet.Sheet;
  chart: Sheet.Chart;
  deck: Markdown.Document;
};

/** The events sheet with its macro timeline chart. */
const makeEvents = (): { sheet: Sheet.Sheet; chart: Sheet.Chart } => {
  const range = `A1:E${technologyTimeline.length}`;
  const sheet = Sheet.make({
    name: 'Macro events',
    rows: technologyTimeline.length + 20,
    columns: 5,
    cells: toCells(technologyTimeline),
    ranges: [{ range: 'A1:E1', key: SheetRange.styleKey, value: 'header' }],
    charts: [
      {
        name: 'Macro timeline',
        range,
        type: 'timeline',
        header: true,
        timeline: {
          start: '1940',
          end: '2030',
          order: [...technologyTimelineOrder],
          colors: { ...technologyTimelineColors },
          hidden: HIDDEN,
        },
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

/** A markdown deck: one slide per `---`; the second embeds the timeline chart. */
const makeDeck = (chart: Sheet.Chart): Markdown.Document =>
  Markdown.make({
    name: 'Macro',
    content: [
      '# The three complexes',
      '',
      '| Complex | Currency | Core actors |',
      '| ------- | -------- | ----------- |',
      ...COMPLEXES.map((row) => `| ${row.join(' | ')} |`),
      '',
      '---',
      '',
      '# Timeline',
      '',
      `![Macro timeline|480](${EID.make({ entityId: chart.id })})`,
      '',
    ].join('\n'),
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
