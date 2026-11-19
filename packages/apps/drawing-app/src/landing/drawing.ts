//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { DSL } from '@dxos/diagram';
import { type Report, render } from '@dxos/drawing';
import { BaseError } from '@dxos/errors';

import { HERO, inline, reportHtml, stageHtml } from './markup.ts';

/** One render of the editor's text: what the page shows of it. */
export type Drawing = {
  readonly report: Report;
  /** The page's report for this render. */
  readonly reportHtml: string;
  /** The drawing on its grid, or undefined when the source does not compile. */
  readonly stageHtml?: string;
};

export class RenderError extends BaseError.extend('RenderError', 'The drawing could not be rendered') {}

export class ConvertError extends BaseError.extend(
  'ConvertError',
  'Only a Mermaid flowchart or classDiagram converts',
) {}

/** The source languages the editor accepts; `.dx` is the drawing's own, Mermaid converts to it. */
export type Language = 'dx' | 'mermaid';

/** Renders source the way the CLI does, through `render`, so the page shows what the CLI would draw. */
export const draw: (text: string, name?: string) => Effect.Effect<Drawing, RenderError> = Effect.fn('draw')(function* (
  text: string,
  name: string = HERO,
) {
  const { svg, report } = yield* Effect.tryPromise({
    try: () => render(text, { name }),
    catch: (cause) => new RenderError({ cause, context: { name } }),
  });
  const stage = svg.length > 0 ? inline(svg, { prefix: 'h', label: `${name} diagram` }) : undefined;
  return {
    report,
    reportHtml: reportHtml(name, report),
    stageHtml: stage && stageHtml(stage.markup, stage.cols, stage.rows),
  };
});

/** The editor's text as `.dx` source: as typed, or converted from Mermaid. */
export const toDsl = (language: Language, text: string): Effect.Effect<string, ConvertError> =>
  language === 'dx'
    ? Effect.succeed(text)
    : DSL.convert(text).pipe(Effect.mapError((cause) => new ConvertError({ cause, context: { name: HERO } })));

/** Converts Mermaid to `.dx` text, then renders that, so both languages are drawn by the same engine. */
export const drawMermaid: (text: string, name?: string) => Effect.Effect<Drawing, RenderError | ConvertError> =
  Effect.fn('drawMermaid')(function* (text: string, name: string = HERO) {
    const source = yield* DSL.convert(text).pipe(
      Effect.mapError((cause) => new ConvertError({ cause, context: { name } })),
    );
    return yield* draw(source, name);
  });
