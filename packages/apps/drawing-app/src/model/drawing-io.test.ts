//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Dsl, DxSvg } from '@dxos/diagram';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';

import { STARTER_SOURCE, compileDrawing, fileName, toDxSvg } from './drawing-io.ts';

describe('drawing-io', () => {
  test('the starter compiles and its download round-trips', async ({ expect }) => {
    const { drawing, canvas } = await EffectEx.runPromise(compileDrawing('Starter', STARTER_SOURCE));
    const svg = toDxSvg({ drawing, canvas, builder: IllustratorModel.SvgBuilder });
    expect(svg).toContain('<svg');

    const payload = await EffectEx.runPromise(IllustratorModel.DrawingFile.fromDxSvg(svg));
    expect(payload?.root).toBe(drawing.id);
    expect(payload?.objects).toHaveLength(2);

    // The embedded source is what `drawing source` prints, so it must compile back to the same scene.
    const source = DxSvg.extract(svg);
    const text = payload?.source?.text ?? '';
    expect(source).toMatchObject({ source: { language: 'dsl' } });
    const { problems } = await EffectEx.runPromise(Dsl.compile(text));
    expect(problems.filter(({ severity }) => severity === 'error')).toHaveLength(0);
    expect(fileName(drawing)).toBe('Starter.dx.svg');
  });

  test('a source that does not compile fails', async ({ expect }) => {
    const exit = await Effect.runPromiseExit(compileDrawing('Broken', 'node A "A"\nedge A -> '));
    expect(exit._tag).toBe('Failure');
  });
});
