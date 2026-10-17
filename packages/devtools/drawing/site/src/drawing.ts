//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';

import { type Report, render } from '@dxos/drawing';

import { HERO, fileName, inline, reportHtml, stageHtml } from './markup.ts';

/** One render of the editor's text: the file to download, and what the page shows of it. */
export type Drawing = {
  readonly file: { readonly fileName: string; readonly svg: string };
  readonly report: Report;
  /** The page's report for this render. */
  readonly reportHtml: string;
  /** The drawing on its grid, or undefined when the source does not compile. */
  readonly stageHtml?: string;
};

/** Tagged so the failure channel stays discriminated rather than collapsing into bare `Error`. */
export class RenderError extends Data.TaggedError('DrawingRenderError')<{ readonly cause: unknown }> {
  override get message(): string {
    return `The drawing could not be rendered: ${this.cause instanceof Error ? this.cause.message : String(this.cause)}`;
  }
}

/**
 * Renders source the way the CLI does, through `render`, so the downloaded `.dx.svg` carries its source and
 * `drawing source` reads it back.
 */
export const draw = (text: string, name: string = HERO): Effect.Effect<Drawing, RenderError> =>
  Effect.gen(function* () {
    const { svg, report } = yield* Effect.tryPromise({
      try: () => render(text, { name }),
      catch: (cause) => new RenderError({ cause }),
    });
    const stage = svg.length > 0 ? inline(svg, { prefix: 'h', label: `${name} diagram` }) : undefined;
    return {
      file: { fileName: fileName(name), svg },
      report,
      reportHtml: reportHtml(name, report),
      stageHtml: stage && stageHtml(stage.markup, stage.cols, stage.rows),
    };
  });
