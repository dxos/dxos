//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Collection, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import * as SheetUtil from '@dxos/plugin-sheet/SheetUtil';

import { Canvas } from '#types';

import * as ArchitectureSpace from './ArchitectureSpace.ts';

/** Header cells (row 1 labels) missing the heading style, or over all-numeric values without end alignment. */
const unstyledHeaders = (sheet: Sheet.Sheet): string[] => {
  const ranges = sheet.ranges.map(({ range, key, value }) => ({
    ...SheetUtil.rangeFromIndex(sheet, range),
    key,
    value,
  }));
  const covered = (key: string, value: string, { col, row }: { col: number; row: number }) =>
    ranges.some(
      (range) =>
        range.key === key &&
        range.value === value &&
        col >= range.from.col &&
        col <= range.to.col &&
        row >= range.from.row &&
        row <= range.to.row,
    );
  const cells = Object.entries(sheet.cells).map(([index, { value }]) => ({
    ...SheetUtil.addressFromIndex(sheet, index),
    value,
  }));
  return cells
    .filter(({ row, value }) => row === 0 && typeof value === 'string' && !value.startsWith('='))
    .flatMap((header) => {
      const column = cells.filter(({ col, row }) => col === header.col && row > 0);
      const numeric =
        column.length > 0 && column.every(({ value }) => typeof value === 'number' || String(value).startsWith('='));
      return [
        ...(covered('style', 'header', header) ? [] : [`${sheet.name}: ${header.value} has no heading style`]),
        ...(numeric && !covered('alignment', 'end', header)
          ? [`${sheet.name}: ${header.value} is not end-aligned`]
          : []),
      ];
    });
};

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('ArchitectureSpace', () => {
  test('seeds every diagram, and Composer, DXOS and EDGE documents that link and embed them', async ({ expect }) => {
    const definition = ArchitectureSpace.make();
    const { db } = await builder.createDatabase({ types: [...definition.schemas] });
    // The root collection is annotated onto whatever object stands for the space's properties.
    const properties = db.add(Obj.make(Collection.Collection, { objects: [] }));
    await EffectEx.runPromise(SampleSpace.applyTo(definition, { db, properties }));

    const drawings = await db.query(Filter.type(Drawing.Drawing)).run();
    expect(drawings).toHaveLength(15);
    // Reference diagrams open read-only for a viewer who has not chosen to edit.
    const canvases = await Promise.all(drawings.map((drawing) => drawing.canvas.load()));
    expect(canvases.every((canvas) => Canvas.isCanvas(canvas) && canvas.settings.readonly === true)).toBe(true);
    const collections = await db.query(Filter.type(Collection.Collection)).run();
    const listed = collections.find((collection) => collection.name === 'Architecture');
    const listedObjects = await Promise.all((listed?.objects ?? []).map((ref) => ref.load()));
    expect(listedObjects.map((object) => Obj.getLabel(object))).toEqual([
      'Composer',
      'DXOS',
      'EDGE',
      'ECHO design',
      'ECHO',
      'Overview',
      'CF Workers',
      'Plugin metrics',
    ]);

    // The ECHO deck carries a description and its own theme.
    const deck = listedObjects.find((object) => Obj.instanceOf(Presentation.Presentation, object));
    expect(deck?.description).toMatch(/^ECHO, the DXOS object database/);
    expect(deck?.theme).toEqual({ accent: '#0891b2', font: 'space-grotesk', monoFont: 'fira' });

    // The metrics sheet charts every plugin row as one stacked horizontal bar, one series per measure, and the busiest
    // plugins' PRs as a pie.
    const sheets = await db.query(Filter.type(Sheet.Sheet)).run();
    const metrics = sheets.find((sheet) => sheet.name === 'Plugin metrics');
    expect(metrics?.rows).toHaveLength(21);
    expect(metrics?.columns).toHaveLength(5);
    const charts = await Promise.all((metrics?.charts ?? []).map((ref) => ref.load()));
    expect(charts).toEqual([
      expect.objectContaining({ range: 'A1:E21', type: 'bar', horizontal: true, stacked: true }),
      expect.objectContaining({ range: 'A1:B9', type: 'pie', header: true }),
    ]);
    expect(metrics && unstyledHeaders(metrics)).toEqual([]);

    // The ECHO design document has eight chapters and embeds the three ECHO diagrams and the benchmarks sheet.
    const design = listedObjects.find((object) => Obj.getLabel(object) === 'ECHO design');
    const designText = Obj.instanceOf(Markdown.Document, design) ? (await design.content.load()).content : '';
    expect(designText.match(/^## /gm)).toHaveLength(8);
    const benchmarks = sheets.find((sheet) => sheet.name === 'ECHO benchmarks');
    const embedded = [...designText.matchAll(/!\[[^\]]*\]\(echo:\/\/\/([A-Z0-9]+)\)/g)].map(([, id]) => id);
    expect(embedded).toEqual(
      ['ECHO data model', 'ECHO replication', 'ECHO queries']
        .map((name) => drawings.find((drawing) => drawing.name === name)?.id)
        .concat(benchmarks?.id),
    );

    // The root document links the other two by id and embeds the Composer drawing.
    const docs = await db.query(Filter.type(Markdown.Document)).run();
    const byName = (name: string) => docs.find((doc) => doc.name === name);
    const [composer, dxos, edge] = ['Composer', 'DXOS', 'EDGE'].map(byName);
    const content = (await composer?.content.load())?.content ?? '';
    const composerDrawing = drawings.find((drawing) => drawing.name === 'Overview');
    expect(content).toContain(`React UI, on the [DXOS](echo:///${dxos?.id}) SDK`);

    // Every paragraph is one line: a line break inside one renders as a break in the editor. Fenced code (the sequence
    // diagram) is lines by nature, so it is left out.
    for (const doc of [composer, dxos, edge]) {
      const text = ((await doc?.content.load())?.content ?? '').replace(/^```[^\n]*\n[\s\S]*?^```$/gm, '');
      const broken = text.split(/\n{2,}/).filter((paragraph) => paragraph.trim().includes('\n'));
      expect(broken).toEqual([]);
    }
    expect(content).toContain(`[EDGE](echo:///${edge?.id})`);
    expect(content).toContain(`![Composer architecture](echo:///${composerDrawing?.id})`);

    // The DXOS document walks the code and draws an edit's path to another device as a sequence diagram.
    const dxosContent = (await dxos?.content.load())?.content ?? '';
    expect(dxosContent).toContain('## Reading the code');
    expect(dxosContent).toMatch(/^```mermaid\n%%[^\n]*\nsequenceDiagram\n/m);
    // The EDGE document draws a device connecting the same way.
    const edgeContent = (await edge?.content.load())?.content ?? '';
    expect(edgeContent).toMatch(/^```mermaid\n%%[^\n]*\nsequenceDiagram\n/m);
  });
});
