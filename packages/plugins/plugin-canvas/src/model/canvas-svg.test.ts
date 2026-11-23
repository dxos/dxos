//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Diagnostics, MermaidEngine, type Scene } from '@dxos/diagram';
import { Database } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import types from '../capabilities/schema.ts';
import { LegacyCanvasBuilder, makeLegacyCanvas } from '../testing/legacy-drawing.ts';
import { CanvasLayoutBuilder } from './canvas-content.ts';
import { addCanvas } from './canvas-document.ts';
import { canvasSvg, canvasWorld } from './canvas-svg.ts';

const FLOW = 'flowchart LR\n  A[Client] --> B[Server]\n  B --> C[(Store)]';
const DIAGRAMS = join(__dirname, '../../../plugin-illustrator/docs/diagrams');
const corpus = readdirSync(DIAGRAMS)
  .filter((file) => file.endsWith('.mmd'))
  .sort()
  .map((file) => [basename(file, '.mmd'), readFileSync(join(DIAGRAMS, file), 'utf8')] as const);

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

const metrics = (objects: readonly Scene.WorldObject[]) => {
  const { nodes, crossings, bends } = Diagnostics.analyze(objects).metrics;
  return { nodes, crossings, bends };
};

describe('canvasSvg', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Drawing.Drawing, Drawing.Canvas, ...types] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const run = <A>(effect: Effect.Effect<A, Error, Database.Service | Capability.Service>) =>
    EffectEx.runPromise(
      effect.pipe(
        Effect.provideService(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
        Effect.provide(Database.layer(db)),
      ),
    );

  const drawn = async (source: string) => {
    const commands = await MermaidEngine.compile(source);
    const canvas = await run(addCanvas());
    CanvasLayoutBuilder.apply(canvas, commands);
    return { commands, canvas };
  };

  test("a diagram drawn onto a canvas's Layout2D renders as SVG with the compiled diagram's metrics", async () => {
    // Straight arrows have no bends to lose, so a small flow keeps every metric.
    const { commands, canvas } = await drawn(FLOW);
    expect(metrics(canvasWorld(canvas))).toEqual(metrics(objectsOf(commands)));
    const svg = canvasSvg(canvas);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Client');
  });

  describe.skipIf(!process.env.DX_RUN_MANUAL_TESTS).each(corpus)('corpus: %s', (_name, source) => {
    // The canvas routes links itself (its connectors), so a diagram's arrow bends are not kept: the Layout2D reads back
    // exactly what the legacy canvas did, with the compiled diagram's nodes.
    test('renders from Layout2D with the legacy canvas metrics and the compiled node count', async () => {
      const { commands, canvas } = await drawn(source);
      const legacy = db.add(makeLegacyCanvas());
      LegacyCanvasBuilder.apply(legacy, commands);
      expect(metrics(canvasWorld(canvas))).toEqual(metrics(LegacyCanvasBuilder.read(legacy).scene.objects));
      expect(metrics(canvasWorld(canvas)).nodes).toBe(metrics(objectsOf(commands)).nodes);
    }, 300_000);
  });
});
