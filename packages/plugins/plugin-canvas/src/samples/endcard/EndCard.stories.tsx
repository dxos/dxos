//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';
import { waitFor, within } from 'storybook/test';

import { EXPOSED_CLOCK_KEY, type Timeline, createTimeline, setKey } from '@dxos/animation';
import { type Database, Obj } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { fromRenderLists2D } from '@dxos/react-ui-canvas/headless';
import { Canvas, createCanvasAtoms, useRegistry } from '@dxos/react-ui-canvas/scene';
import { useDocumentHost } from '@dxos/react-ui-canvas/testing';
import { Loading } from '@dxos/react-ui/testing';
import { createStoryDecorators } from '@dxos/storybook-testing';

import * as CanvasPlugin from '#meta';
import { generatorCompiler, seedContent, updateCanvasRecord, writeViews } from '#model';
import { translations } from '#translations';
import { Canvas as CanvasType, Generator } from '#types';

import {
  createGeneratorWorker,
  useCanvasGenerators,
  useCanvasNodes,
} from '../../containers/CanvasArticle/use-canvas-scene.ts';
import { DURATION, FRAME, ROOT, endCardKeys, logoComposite, rootScene } from './spec.ts';

const END_CARD_NAME = 'End card';

/** The drawing as a person would have drawn it: the logo object and the text, at rest, with no timeline yet. */
const seed = (db: Database.Database): Drawing.Drawing => {
  const content = {};
  seedContent(content, ROOT);
  writeViews(content, { [ROOT]: rootScene(), [logoComposite().id]: logoComposite() });
  updateCanvasRecord(content, { theme: 'film' });
  const canvas = db.add(Drawing.makeCanvas({ schema: CanvasType.SCENE_SCHEMA, content }));
  return db.add(Drawing.make({ name: END_CARD_NAME, canvas }));
};

/** Every entrance keyed, as an animator shot over the drawing holds them: a canvas stores no timeline (F-2.3). */
const endCardTimeline = (): Timeline =>
  endCardKeys().reduce(
    (timeline, { target, property, t, value, easing }) =>
      setKey(timeline, target, property, { t, value, ...(easing !== undefined ? { easing } : {}) }),
    createTimeline(DURATION),
  );

type FilmProps = { chrome: boolean };

/**
 * A fresh end card in the client's newest space, seeded once per mount: the client may outlive the page (its services
 * in a shared worker), so a drawing from an earlier load is never reused.
 */
const useEndCard = () => {
  const spaces = useSpaces();
  const [drawing, setDrawing] = useState<Drawing.Drawing>();
  useEffect(() => {
    // Seeded once, into whichever space is newest then; everything after reads the drawing's own database.
    const space = spaces[spaces.length - 1];
    if (space && !drawing) {
      setDrawing(seed(space.db));
    }
  }, [spaces, drawing]);
  return { db: drawing ? Obj.getDatabase(drawing) : undefined, drawing };
};

/** The end card shown as a film: the 1920x1080 frame fitted to the view, playing its keys from the start. */
const Film = ({ chrome }: FilmProps) => {
  const { db, drawing } = useEndCard();
  const canvas = drawing?.canvas.target;
  if (!db || !Drawing.isCanvas(canvas)) {
    return <Loading />;
  }
  return <FilmView db={db} chrome={chrome} />;
};

type FilmViewProps = FilmProps & { db: Database.Database };

const FilmView = ({ db, chrome }: FilmViewProps) => {
  const registry = useRegistry();
  // A film is only played, so it draws the end card from memory rather than binding the drawing.
  const { document, onIntent, onModelIntent } = useDocumentHost(() =>
    fromRenderLists2D([rootScene(), logoComposite()], { root: ROOT }),
  );
  const nodes = useCanvasNodes();
  const generators = useCanvasGenerators(db);
  const atoms = useMemo(() => createCanvasAtoms(ROOT), []);
  // The host holds the timeline; with the chrome, keys edited at a time land here.
  const [timeline, setTimeline] = useState(endCardTimeline);
  // Plays once from the start; a frame renderer seeks instead, which pauses it.
  useEffect(() => registry.set(atoms.clock.playing, true), [registry, atoms]);
  return (
    <Canvas.Root
      document={document}
      onIntent={chrome ? onIntent : undefined}
      onModelIntent={chrome ? onModelIntent : undefined}
      atoms={atoms}
      nodes={nodes}
      theme='film'
      frame={FRAME}
      margin={0}
      readonly={!chrome}
      exportable
      timeline={timeline}
      onTimelineChange={chrome ? setTimeline : undefined}
      generators={generators}
      compileGenerator={generatorCompiler}
      createGeneratorWorker={createGeneratorWorker}
      initialDisplay={{ snap: false, fit: true }}
    >
      <Canvas.Viewport />
      {chrome && (
        <>
          <Canvas.Navigation />
          <Canvas.Tools />
          <Canvas.Actions />
          <Canvas.Timeline />
          <Canvas.Properties />
          <Canvas.Layers />
          <Canvas.Objects />
        </>
      )}
    </Canvas.Root>
  );
};

const meta: Meta<FilmProps> = {
  title: 'plugins/plugin-canvas/samples/EndCard',
  render: (args) => <Film {...args} />,
  args: { chrome: false },
  decorators: createStoryDecorators({
    types: [Drawing.Drawing, Drawing.Canvas, Generator.Generator],
    plugins: [IllustratorPlugin.make(), CanvasPlugin.make()],
  }),
  parameters: { layout: 'fullscreen', translations },
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The DXOS end card (tools/autocue `EndCard`, 3 s) as a canvas document played through its keys, and exported with
 * `scripts/render-story.mjs`, which seeks the exposed clock.
 *
 * Test:
 * 1. The film view mounts, its clock exposed for export.
 * 2. Seeking to 2 s draws the scene at 2 s.
 */
export const Default: Story = {};

/** The default story, driven: its steps run as a play test. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. Mounted (the first compile loads esbuild's binary).
    await canvas.findByTestId('scene-view', undefined, { timeout: 60_000 });
    const seek = await waitFor(() => {
      const exposed: unknown = Reflect.get(globalThis, EXPOSED_CLOCK_KEY);
      const method: unknown =
        typeof exposed === 'object' && exposed !== null ? Reflect.get(exposed, 'seek') : undefined;
      if (typeof method !== 'function') {
        throw new Error('The scene clock is not exposed yet.');
      }
      return (t: number) => typeof method === 'function' && Reflect.apply(method, exposed, [t]);
    });

    // 2. Every layer draws the time it was asked for.
    seek(2);
    await waitFor(
      () => {
        const times = [...canvasElement.querySelectorAll('[data-frame-time]')].map((element) =>
          element.getAttribute('data-frame-time'),
        );
        if (times.length === 0 || times.some((time) => time !== '2.0000')) {
          throw new Error(`Not drawn at 2 s yet: ${times.join(', ')}`);
        }
      },
      { timeout: 20_000 },
    );
  },
};

/** The same document with the editor's chrome: the palette, the action and timeline bars, and the inspectors. */
export const Editor: Story = {
  args: { chrome: true },
};
