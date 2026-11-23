//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DSL, SVG_SCHEMA } from '@dxos/diagram';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';

import { fileName, toDxSvg } from './drawing-file.ts';

const SOURCE = `node Idea "Idea"
node Sketch "Sketch" right-of Idea
edge Idea -> Sketch "write .dx"
`;

const makeSvgDrawing = async (name: string) => {
  const { commands } = await EffectEx.runPromise(DSL.compile(SOURCE));
  return IllustratorModel.DrawingFile.makeDrawing({ name, commands });
};

describe('drawing-file', () => {
  test('an export carries the scene as a laid-out drawing and as DSL that compiles', async ({ expect }) => {
    const { drawing, canvas } = await makeSvgDrawing('Plan');
    const svg = toDxSvg({ drawing, canvas, builder: IllustratorModel.SvgBuilder });
    expect(svg).toContain('<svg');

    const payload = await EffectEx.runPromise(IllustratorModel.DrawingFile.fromDxSvg(svg));
    const [exportedCanvas, exportedDrawing] = payload?.objects ?? [];
    expect(exportedCanvas).toMatchObject({ schema: SVG_SCHEMA });
    expect(exportedDrawing).toMatchObject({ name: 'Plan' });
    expect(payload?.root).toBe(exportedDrawing?.id);

    const { problems } = await EffectEx.runPromise(DSL.compile(payload?.source?.text ?? ''));
    expect(problems.filter(({ severity }) => severity === 'error')).toHaveLength(0);
  });

  test('the file name comes from the diagram name', ({ expect }) => {
    expect(fileName({ name: 'Service map' })).toBe('Service-map.dx.svg');
    expect(fileName({ name: '' })).toBe('Untitled.dx.svg');
  });
});
