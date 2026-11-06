//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import { Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { PublicKey } from '@dxos/keys';
import { toEcho } from '@dxos/scene';

import { openScene } from '#model';
import { Canvas } from '#types';

import types from '../../capabilities/schema.ts';
import { useCanvasLoaded, useSceneDocument } from './use-scene-document.ts';

describe('useCanvasLoaded', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a canvas read back after a reload draws its open scene and nested layouts once their refs load', async () => {
    const spaceKey = PublicKey.random();
    await using peer = await builder.createPeer({ types });
    let canvasId: string;
    let rootUrl: string;
    {
      await using db = await peer.createDatabase(spaceKey);
      rootUrl = db.rootUrl ?? '';
      const { root, layouts, models } = toEcho(Dsl.readScenes(EXEMPLARS.subscene).document);
      [...models.values(), ...layouts.values(), root].forEach((object) => db.add(object));
      const canvas = db.add(
        Obj.make(Canvas.Canvas, {
          scenes: [Ref.make(root)],
          layouts: [...layouts.values()].map((layout) => Ref.make(layout)),
          settings: {},
        }),
      );
      canvasId = canvas.id;
      await db.flush();
    }

    await peer.reload();
    await using db = await peer.openDatabase(spaceKey, rootUrl);
    const [canvas] = await db.query(Filter.id(canvasId)).run();
    if (!Canvas.isCanvas(canvas)) {
      throw new Error('The reloaded object is the canvas.');
    }

    const { result } = renderHook(() => {
      useCanvasLoaded(canvas);
      return useSceneDocument(openScene(canvas));
    });
    await waitFor(() =>
      expect(result.current?.layouts.find((layout) => layout.id === 'b-detail')?.elements.x?.label).toBe('X'),
    );
  });
});
