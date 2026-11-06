//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { useAtomValue } from '@effect/atom-react/Hooks';
import { act, cleanup, render } from '@testing-library/react';
import React, { useEffect } from 'react';
import { afterEach, describe, expect, test } from 'vitest';

import { type ViewportProps } from '@dxos/react-ui-canvas';
import { type LayoutIntent, type Scene } from '@dxos/scene';

import { type CommandTable } from '../commands.ts';
import { type DimensionConfig } from '../config.ts';
import { SceneEditor } from '../SceneEditor.tsx';
import {
  useSceneCommands,
  useSceneDocument,
  useSceneLook,
  useSceneNavigation,
  useSceneSelection,
  useSceneServices,
  useSceneTime,
  useSceneTools,
} from './context.ts';
import { createViewDimension } from './view.tsx';

const TestViewport = ({ children }: ViewportProps<{ zoom: number }>) => <div>{children}</div>;

const CONFIG: DimensionConfig<{ zoom: number }> = {
  dim: '2d',
  create: createViewDimension({
    Viewport: TestViewport,
    camera: { fit: () => ({ zoom: 1 }), reset: (authored) => authored, zoom: (camera) => camera, percent: () => 100 },
  }),
  tools: [{ id: 'select', icon: 'ph--cursor--regular', label: 'Select', category: 'select' }],
  geometry: { pasteOffset: (pasted) => ({ x: pasted, y: pasted }), snap: { move: 1 } },
  display: { themes: [{ id: 'default', label: 'Default' }], grids: ['lines'], guides: false },
  propertyForm: () => null,
};

const documentWith = (ids: readonly string[]): Scene.SceneDocument => ({
  scenes: [{ id: 's', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [{ id: 'root', dim: '2d', elements: Object.fromEntries(ids.map((id) => [id, { id, type: 'rect' }])) }],
  models: [],
});

const DISPLAY = { theme: 'default', grid: true, snap: false };

/** A, B and a link over them, each with a key, so a restack has an order to work against. */
const ORDERED: Scene.SceneDocument = {
  scenes: [{ id: 's', dim: '2d', layout: 'root', camera: { center: { x: 0, y: 0 }, zoom: 1 } }],
  layouts: [
    {
      id: 'root',
      dim: '2d',
      elements: {
        a: { id: 'a', type: 'rect', z: 'a1' },
        b: { id: 'b', type: 'rect', z: 'a2' },
        ab: { id: 'ab', type: 'line', z: 'a3', source: { node: 'a' }, target: { node: 'b' } },
      },
    },
  ],
  models: [],
};

describe('SceneEditor aspects', () => {
  afterEach(() => cleanup());

  test('an edit changes no context value a part reads', () => {
    const seen: Record<string, unknown>[] = [];
    const drawn: number[] = [];
    const Probe = () => {
      const document = useSceneDocument('Probe');
      seen.push({
        services: useSceneServices('Probe'),
        document,
        navigation: useSceneNavigation('Probe'),
        selection: useSceneSelection('Probe'),
        tools: useSceneTools('Probe'),
        commands: useSceneCommands('Probe'),
        time: useSceneTime('Probe'),
        look: useSceneLook('Probe'),
      });
      drawn.push(Object.keys(useAtomValue(document.atoms.document).layouts[0]?.elements ?? {}).length);
      return null;
    };
    const editor = (document: Scene.SceneDocument) => (
      <SceneEditor.Root config={CONFIG} document={document} scene='s' onIntent={() => {}} display={DISPLAY}>
        <Probe />
      </SceneEditor.Root>
    );
    const { rerender } = render(editor(documentWith([])));
    rerender(editor(documentWith(['a'])));
    // The edit reaches the part through its atom, and every aspect it reads holds still.
    expect(drawn.at(-1)).toBe(1);
    for (const aspect of Object.keys(seen[0] ?? {})) {
      expect(new Set(seen.map((values) => values[aspect])).size, aspect).toBe(1);
    }
  });

  test('the host restacks the selection against the whole view, in one batch', () => {
    const intents: { layout: string; intent: LayoutIntent }[] = [];
    let table: CommandTable | undefined;
    const Probe = ({ select }: { select: readonly string[] }) => {
      const selection = useSceneSelection('Probe');
      table = useAtomValue(useSceneCommands('Probe').atoms.table);
      useEffect(() => selection.commands.select(select), [select]);
      return null;
    };
    render(
      <SceneEditor.Root
        config={CONFIG}
        document={ORDERED}
        scene='s'
        onIntent={(layout, intent) => intents.push({ layout, intent })}
        display={DISPLAY}
      >
        <Probe select={['a']} />
      </SceneEditor.Root>,
    );
    act(() => table?.get('bring-to-front')?.run?.());
    // One batch, one undo step; the shape is keyed above the link, not merely above the other shape.
    expect(intents).toHaveLength(1);
    expect(intents[0]?.layout).toBe('root');
    const batch = intents[0]?.intent;
    expect(batch?.kind).toBe('batch');
    const reorders = batch?.kind === 'batch' ? batch.intents : [];
    expect(reorders.map((intent) => intent.kind)).toEqual(['reorder']);
    const [reorder] = reorders;
    expect(reorder?.kind === 'reorder' && reorder.id).toBe('a');
    expect(reorder?.kind === 'reorder' && reorder.order > 'a3').toBe(true);
  });

  test('a 3D scene offers no restack, since it draws by depth rather than in a stored order', () => {
    let table: CommandTable | undefined;
    const Probe = () => {
      const selection = useSceneSelection('Probe');
      table = useAtomValue(useSceneCommands('Probe').atoms.table);
      useEffect(() => selection.commands.select(['a']), []);
      return null;
    };
    render(
      <SceneEditor.Root
        config={{ ...CONFIG, dim: '3d' }}
        document={ORDERED}
        scene='s'
        onIntent={() => {}}
        display={DISPLAY}
      >
        <Probe />
      </SceneEditor.Root>,
    );
    expect(table?.get('bring-to-front')?.enabled).toBe(false);
    expect(table?.get('send-to-back')?.enabled).toBe(false);
  });
});
