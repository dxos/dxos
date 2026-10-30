//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, {
  type PropsWithChildren,
  useCallback,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { type Timeline } from '@dxos/animation';
import { Dsl } from '@dxos/diagram';
import {
  type ClipboardCodec,
  type DimensionConfig,
  type EditorDisplay,
  type EditorShot,
  SceneEditor,
  createHistory,
  useSceneEditor,
} from '@dxos/react-ui-canvas';
import { type VersionedSource, readPath, writePath } from '@dxos/react-ui-canvas/headless';
import { type Layer, type LayoutIntent, type ModelIntent, Scene, applyIntent, applyModelIntent } from '@dxos/scene';

import { flattenLayout, liftLayout } from '../canvas/index.ts';
import { CATALOGS_3D, config2d, config3d } from '../editor/index.ts';

/** The `.dx` text a copy writes and a paste reads, as the canvas plugin's codec (without its model folding). */
const codec: ClipboardCodec = {
  write: (_document, _layout, fragment) => Dsl.printScenes({ scenes: [], layouts: [fragment], models: [] }),
  read: (text, dim) => {
    const layout = Dsl.readScenes(text).document.layouts[0];
    return layout && (dim === '3d' ? liftLayout(layout) : flattenLayout(layout));
  },
};

const byKey = (document: Scene.SceneDocument): Record<string, Scene.LayoutRecord> =>
  Object.fromEntries(document.layouts.map((layout) => [layout.id, layout]));

const isLayoutRecord = Schema.is(Schema.Union([Scene.LayoutRecord2D, Scene.LayoutRecord3D]));

/** A source's heads are the documents it held, which the host never mutates. */
const isDocument = (value: unknown): value is Scene.SceneDocument =>
  typeof value === 'object' && value !== null && 'layouts' in value && Array.isArray(value.layouts);

/** Applies `intent` to layout `key`, making the layout (empty, in the scene's dimension) when it is new. */
const applyLayout = (
  document: Scene.SceneDocument,
  key: string,
  dim: Scene.Dimension,
  intent: LayoutIntent,
): Scene.SceneDocument => {
  const existing = document.layouts.find((layout) => layout.id === key);
  const layout: Scene.LayoutRecord = existing ?? { id: key, dim, elements: {} };
  const next = applyIntent(layout, intent);
  return next === existing
    ? document
    : {
        ...document,
        layouts: existing
          ? document.layouts.map((entry) => (entry.id === key ? next : entry))
          : [...document.layouts, next],
      };
};

/** A document held in memory as the host's store: a versioned source over its layouts, so undo works as in the app. */
const useMemoryDocument = (initial: Scene.SceneDocument) => {
  const ref = useRef(initial);
  const [, render] = useReducer((count: number) => count + 1, 0);
  const update = useCallback((next: Scene.SceneDocument) => {
    if (next !== ref.current) {
      ref.current = next;
      render();
    }
  }, []);
  const source = useMemo<VersionedSource>(
    () => ({
      heads: () => ref.current,
      read: (path, heads) => readPath(byKey(isDocument(heads) ? heads : ref.current), path),
      write: (writes) => {
        const layouts = writes.reduce<unknown>(
          (value, { path, value: entry }) => writePath(value, path, entry),
          byKey(ref.current),
        );
        const records =
          typeof layouts === 'object' && layouts !== null ? Object.values(layouts).filter(isLayoutRecord) : [];
        update({ ...ref.current, layouts: records });
      },
    }),
    [update],
  );
  return { ref, update, source };
};

export type SceneEditorStoryProps = PropsWithChildren<{
  document: Scene.SceneDocument;
  role?: string;
  readonly?: boolean;
  /** Docked, every inspector section shows; floating, only Properties. */
  docked?: boolean;
  /** Elements selected once the editor mounts, so Properties has something to show. */
  select?: readonly string[];
  /** The shots staging the scene; the Timeline panel shows only when set (an empty list offers to make one). */
  shots?: readonly EditorShot[];
  display?: Partial<EditorDisplay>;
}>;

/**
 * The shared scene editor over an in-memory document, in the dimension of its first scene: what plugin-canvas's
 * `SceneArticle` does over ECHO (intents, model intents, undo, display and camera view state, shots), for
 * stories of the editor and its parts. The children are the editor's parts.
 */
export const SceneEditorStory = ({ document: initial, ...props }: SceneEditorStoryProps) => {
  const scene = initial.scenes[0];
  if (!scene) {
    return null;
  }
  return scene.dim === '3d' ? (
    <Host config={config3d} document={initial} authored={scene.camera} theme={scene.theme ?? 'cad'} {...props} />
  ) : (
    <Host
      config={config2d}
      document={initial}
      authored={{ x: 0, y: 0, zoom: 1 }}
      theme={scene.theme ?? 'flat'}
      {...props}
    />
  );
};

type HostProps<C> = Omit<SceneEditorStoryProps, 'document'> & {
  config: DimensionConfig<C>;
  document: Scene.SceneDocument;
  authored: C;
  theme: string;
};

const Host = <C,>({
  config,
  document: initial,
  authored,
  theme,
  role,
  readonly: initialReadonly = false,
  docked: initialDocked = false,
  select,
  shots: initialShots,
  display: initialDisplay,
  children,
}: HostProps<C>) => {
  const { ref, update, source } = useMemoryDocument(initial);
  const sceneKey = initial.scenes[0]?.id ?? '';
  const history = useMemo(
    () => createHistory({ steps: { done: [], undone: [] }, source, writeDocument: update }),
    [source, update],
  );
  const handleIntent = useCallback(
    (layout: string, intent: LayoutIntent) => update(applyLayout(ref.current, layout, config.dim, intent)),
    [ref, update, config.dim],
  );
  const handleModelIntent = useCallback(
    (intent: ModelIntent) => {
      const { doc, problems } = applyModelIntent(ref.current, intent);
      update(doc);
      return problems.map(({ message }) => message);
    },
    [ref, update],
  );
  const readDocument = useCallback(() => ref.current, [ref]);
  const handleLayersChange = useCallback(
    (key: string, layers: readonly Layer[]) =>
      update({
        ...ref.current,
        layouts: ref.current.layouts.map((layout) =>
          layout.id === key
            ? { ...layout, layers: Object.fromEntries(layers.map((layer) => [layer.id, layer])) }
            : layout,
        ),
      }),
    [ref, update],
  );

  const [readonly, setReadonly] = useState(initialReadonly);
  const [docked, setDocked] = useState(initialDocked);
  const [camera, setCamera] = useState<C>();
  const [display, setDisplay] = useState<EditorDisplay>({
    theme,
    grid: true,
    snap: true,
    guides: config.display.guides ? true : undefined,
    axes: false,
    ...initialDisplay,
  });
  const handleDisplayChange = useCallback(
    (next: Partial<EditorDisplay>) =>
      setDisplay((current) => ({
        ...current,
        ...next,
        ...('themeOverride' in next ? { theme: next.themeOverride ?? theme } : {}),
      })),
    [theme],
  );
  const [shots, setShots] = useState(initialShots);
  const handleShotChange = useCallback(
    (id: string | undefined, timeline: Timeline) =>
      setShots((current = []) =>
        id === undefined
          ? [...current, { id: `shot-${current.length + 1}`, timeline }]
          : current.map((shot) => (shot.id === id ? { ...shot, timeline } : shot)),
      ),
    [],
  );

  return (
    <SceneEditor.Root
      config={config}
      document={ref.current}
      scene={sceneKey}
      role={role}
      readonly={readonly}
      onReadonlyChange={setReadonly}
      onIntent={handleIntent}
      history={history}
      onModelIntent={handleModelIntent}
      readDocument={readDocument}
      onLayersChange={handleLayersChange}
      codec={codec}
      display={display}
      onDisplayChange={handleDisplayChange}
      camera={camera}
      authoredCamera={authored}
      onCameraChange={setCamera}
      docked={docked}
      onDockedChange={setDocked}
      shots={shots}
      onShotChange={initialShots ? handleShotChange : undefined}
    >
      {select && <Select ids={select} />}
      {children}
    </SceneEditor.Root>
  );
};

/** Selects `ids` once the editor mounts. */
const Select = ({ ids }: { ids: readonly string[] }) => {
  const { store } = useSceneEditor('SceneEditorStory.Select');
  useLayoutEffect(() => store.select(ids), []);
  return null;
};

/** The full editor: every floating panel over the viewport, and the inspector. */
export const FullEditor = ({ dim }: { dim: Scene.Dimension }) => (
  <>
    <SceneEditor.Viewport>
      <SceneEditor.Tools />
      <SceneEditor.Actions />
      <SceneEditor.Camera />
      <SceneEditor.Display />
      <SceneEditor.ContextMenu />
      <SceneEditor.Notice />
      <SceneEditor.Timeline />
    </SceneEditor.Viewport>
    <SceneEditor.Inspector catalogs={dim === '3d' ? CATALOGS_3D : undefined} />
  </>
);
