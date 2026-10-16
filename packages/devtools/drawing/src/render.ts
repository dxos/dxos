//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Diagnostics, Dsl, DxSvg, SvgFile } from '@dxos/diagram';
import * as EffectEx from '@dxos/effect/EffectEx';

/** One problem with the source or the layout, as the engine words it. */
export type Note = { readonly severity: 'error' | 'warning' | 'info'; readonly message: string };

/** What a render produced: the counts an agent checks, and every problem found. */
export type Report = {
  readonly nodes: number;
  readonly connectors: number;
  readonly crossings: number;
  readonly bends: number;
  readonly notes: readonly Note[];
  /** True when the source does not compile or the layout has a defect (overlap, a route through a box). */
  readonly failed: boolean;
};

/**
 * The `.dx.svg` payload drawing.sh writes: the source alone, since the drawing can be laid out again from
 * it. Composer's importer compiles a payload with no objects from its source.
 */
export type Payload = {
  readonly format: typeof DxSvg.FORMAT;
  readonly version: 1;
  readonly name: string;
  readonly source: { readonly language: 'dsl'; readonly text: string };
};

export type RenderOptions = {
  /** Shown as the drawing's name when the file is imported. */
  readonly name: string;
  /** Write a bare SVG, without the embedded source. */
  readonly plain?: boolean;
};

export type RenderResult = { readonly svg: string; readonly report: Report };

/** Compiles semantic-DSL source, lays it out and serializes it to SVG. */
export const render = (text: string, { name, plain = false }: RenderOptions): Promise<RenderResult> =>
  EffectEx.runPromise(
    Effect.gen(function* () {
      const { commands, problems } = yield* Dsl.compile(text);
      const sourceNotes = problems.map(({ severity, message }): Note => ({ severity, message }));
      if (problems.some(({ severity }) => severity === 'error')) {
        return {
          svg: '',
          report: { nodes: 0, connectors: 0, crossings: 0, bends: 0, notes: sourceNotes, failed: true },
        };
      }

      const objects = Dsl.toScene(commands).objects;
      const analysis = Diagnostics.analyze(objects);
      const { nodes, connectors, crossings, bends } = analysis.metrics;
      const notes = [
        ...sourceNotes,
        ...analysis.diagnostics.map(({ severity, message }): Note => ({ severity, message })),
      ];
      const picture = SvgFile.toSvgFile(objects);
      const payload: Payload = { format: DxSvg.FORMAT, version: 1, name, source: { language: 'dsl', text } };
      return {
        svg: plain ? picture : DxSvg.embed(picture, payload),
        report: {
          nodes,
          connectors,
          crossings,
          bends,
          notes,
          failed: Diagnostics.errors(analysis).length > 0,
        },
      };
    }),
  );

/**
 * The diagram source a `.dx.svg` carries, or undefined for a plain SVG or one exported without its source.
 * Reads drawing.sh files and Composer exports alike, since both keep the source under `source.text`.
 */
export const source = (svg: string): string | undefined => {
  const payload = DxSvg.extract(svg);
  if (typeof payload !== 'object' || payload === null || !('source' in payload)) {
    return undefined;
  }
  const { source } = payload;
  return typeof source === 'object' && source !== null && 'text' in source && typeof source.text === 'string'
    ? source.text
    : undefined;
};
