//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { waitFor, within } from 'storybook/test';

import { EXPOSED_CLOCK_KEY, type Timeline } from '@dxos/animation';
import { type Database } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Canvas, createCanvasAtoms, sampleDocument, useRegistry } from '@dxos/react-ui-canvas';
import { type EditorDisplay, type EditorShot, SceneEditor, createConfig2D } from '@dxos/react-ui-canvas-editor';
import { useDocumentHost } from '@dxos/react-ui-canvas/testing';
import { Loading } from '@dxos/react-ui/testing';
import { createStoryDecorators } from '@dxos/storybook-testing';

import * as CanvasPlugin from '#meta';
import { generatorCompiler } from '#model';
import { translations } from '#translations';
import { Generator } from '#types';

import {
  createGeneratorWorker,
  useCanvasGenerators,
  useCanvasNodes,
} from '../../containers/CanvasArticle/use-canvas-scene.ts';
import { DURATION, FRAME, ROOT, endCardDocument, endCardShot } from './spec.ts';

/** The shot the end card plays: its one take, as an animator shot over the drawing holds it. */
const SHOT = 'end-card';

/** The film's clock: it plays the shot once, at the shot's rate. */
const PLAYBACK = { duration: DURATION };

type FilmProps = { chrome: boolean };

/** The client's newest space, whose generators a film may draw. */
const useStoryDatabase = (): Database.Database | undefined => {
  const spaces = useSpaces();
  return spaces[spaces.length - 1]?.db;
};

/** The end card as a film, or with the editor's chrome over it. */
const Film = ({ chrome }: FilmProps) => {
  const db = useStoryDatabase();
  if (!db) {
    return <Loading />;
  }
  return chrome ? <EditorView db={db} /> : <FilmView db={db} />;
};

type ViewProps = { db: Database.Database };

/**
 * The 1920x1080 frame fitted to the view, drawing the end card as its shot samples it at the view's clock, which plays
 * from the start once; a frame renderer seeks the clock instead, which pauses it.
 */
const FilmView = ({ db }: ViewProps) => {
  const registry = useRegistry();
  const base = useMemo(endCardDocument, []);
  const shot = useMemo(endCardShot, []);
  const nodes = useCanvasNodes();
  const generators = useCanvasGenerators(db);
  const atoms = useMemo(() => createCanvasAtoms(ROOT), []);
  const time = useAtomValue(atoms.clock.time);
  const document = useMemo(() => sampleDocument(base, ROOT, shot, time), [base, shot, time]);
  useEffect(() => registry.set(atoms.clock.playing, true), [registry, atoms]);
  return (
    <Canvas.Root
      document={document}
      atoms={atoms}
      nodes={nodes}
      theme='film'
      frame={FRAME}
      margin={0}
      readonly
      exportable
      playback={PLAYBACK}
      generators={generators}
      compileGenerator={generatorCompiler}
      createGeneratorWorker={createGeneratorWorker}
      initialDisplay={{ snap: false, fit: true }}
    >
      <Canvas.Viewport />
    </Canvas.Root>
  );
};

/** The end card in the scene editor, its shot on the Timeline panel: edits land on the drawing at rest, keys on the shot. */
const EditorView = ({ db }: ViewProps) => {
  const { document, onIntent, onModelIntent } = useDocumentHost(endCardDocument);
  const nodes = useCanvasNodes();
  const generators = useCanvasGenerators(db);
  const config = useMemo(
    () => createConfig2D({ nodes, generators, compileGenerator: generatorCompiler, createGeneratorWorker }),
    [nodes, generators],
  );
  const [display, setDisplay] = useState<EditorDisplay>({ theme: 'film', grid: false, snap: false });
  const handleDisplayChange = useCallback(
    (next: Partial<EditorDisplay>) => setDisplay((current) => ({ ...current, ...next })),
    [],
  );
  const [shots, setShots] = useState<EditorShot[]>(() => [{ id: SHOT, name: 'End card', timeline: endCardShot() }]);
  const handleShotChange = useCallback(
    (id: string | undefined, timeline: Timeline) =>
      setShots((current) => current.map((shot) => (shot.id === (id ?? SHOT) ? { ...shot, timeline } : shot))),
    [],
  );
  const scene = document.scenes[0]?.id ?? '';
  return (
    <SceneEditor.Root
      config={config}
      document={document}
      scene={scene}
      onIntent={onIntent}
      onModelIntent={onModelIntent}
      display={display}
      onDisplayChange={handleDisplayChange}
      shots={shots}
      onShotChange={handleShotChange}
      timeline
    >
      <SceneEditor.Viewport>
        <SceneEditor.Tools />
        <SceneEditor.Actions />
        <SceneEditor.Camera />
        <SceneEditor.Display />
        <SceneEditor.Timeline />
      </SceneEditor.Viewport>
      <SceneEditor.Inspector />
    </SceneEditor.Root>
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
 * The DXOS end card (tools/autocue `EndCard`, 3 s) as a scene document drawn as its shot samples it, and exported with
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

/** The same document in the scene editor: the tools, the action bar, the shot on the Timeline panel, and the inspector. */
export const Editor: Story = {
  args: { chrome: true },
};
