//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { createSquareTree } from '@dxos/react-ui-canvas/testing';
import { Scene } from '@dxos/scene';

import { createCanvas, openScene, writeViews } from '#model';

import types from '../../capabilities/schema.ts';
import { useMigratedCanvas } from './use-canvas-scene.ts';

describe('useMigratedCanvas', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Drawing.Drawing, Drawing.Canvas, ...types] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const legacyDrawing = () => {
    const tree = createSquareTree();
    const canvas = db.add(createCanvas());
    Obj.update(canvas, (canvas) => {
      Reflect.set(canvas.content, 'canvas', { kind: 'canvas', root: tree.root });
      delete canvas.content['scene:root'];
      writeViews(canvas.content, Object.fromEntries(tree.views.map((view) => [view.id, view])));
    });
    return { canvas, drawing: db.add(Drawing.make({ name: 'Legacy', canvas })) };
  };

  test('opening a legacy scene drawing for writing migrates it onto a Canvas over Layout2D', async () => {
    const { canvas, drawing } = legacyDrawing();
    await db.flush();
    const { result } = renderHook(() => useMigratedCanvas(drawing, canvas, true));
    await waitFor(() => expect(result.current).toBeDefined());
    expect(drawing.canvas.target).toBe(result.current);
    const layout = result.current && openScene(result.current)?.layout.target;
    expect(Obj.instanceOf(Scene.Layout2D, layout) && Object.keys(layout.elements).sort()).toEqual([
      'circle',
      'polygon',
      'square',
    ]);
  });

  test('a drawing only looked at is left as it is', async () => {
    const { canvas, drawing } = legacyDrawing();
    await db.flush();
    const { result } = renderHook(() => useMigratedCanvas(drawing, canvas, false));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current).toBeUndefined();
    expect(drawing.canvas.target).toBe(canvas);
  });
});
