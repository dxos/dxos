//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Report, render } from '@dxos/drawing';
import { BaseError } from '@dxos/errors';

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

export class RenderError extends BaseError.extend('RenderError', 'The drawing could not be rendered') {}

/**
 * Renders source the way the CLI does, through `render`, so the downloaded `.dx.svg` carries its source and
 * `drawing source` reads it back.
 */
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
    file: { fileName: fileName(name), svg },
    report,
    reportHtml: reportHtml(name, report),
    stageHtml: stage && stageHtml(stage.markup, stage.cols, stage.rows),
  };
});
