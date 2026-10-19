//
// Copyright 2026 DXOS.org
//

//
// Root view of the scene engine (§6–§8): owns the camera, the scene path, selection and the pointer
// state machine; renders the current scene through `SceneLayer` under one CSS transform and drills
// in and out of portals with a camera transition then a root swap. Every model change goes through
// the projection as an intent; the view never writes coordinates itself (decision 11).
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';

import { type CanvasController } from '../../engine/index.ts';
import {
  type Capabilities,
  type ElementId,
  type Intent,
  type Layer,
  type LayerId,
  type Scene,
  type SceneId,
  type SceneStore,
  createTimeline,
  getElement,
  isInstanceNode,
  isLink,
} from '../../model/index.ts';
import {
  activeLayer,
  compositeBounds,
  compositeScenes,
  createId,
  createLayer,
  instanceCounts,
  mergeLayersIntent,
  moveLayer,
  sceneLayers,
  sceneOptions,
} from '../../utils/index.ts';
import {
  AboutInspector,
  type AboutStat,
  LayersInspector,
  ObjectsInspector,
  PropertiesInspector,
  type PropertiesInspectorProps,
  ViewsInspector,
} from '../inspectors/index.ts';
import { InspectorSection, type InspectorSectionDef } from '../panels/index.ts';
import { SceneLayer } from '../SceneLayer/index.ts';
import { useCanvasDocument, useCanvasNavigation, useCanvasSelection, useCanvasServices } from './CanvasContext.ts';

//
// Properties
//

export type CanvasPropertiesProps = Pick<PropertiesInspectorProps, 'fields' | 'db' | 'getOptions' | 'overrides'> & {
  /** Narrows the scenes a scene shape may open (e.g. to the host's own, not those it shows from elsewhere). */
  sceneFilter?: (id: SceneId) => boolean;
};

/** The selected element's properties: an inspector that floats only while something is selected. */
export const CanvasProperties = ({ fields, db, getOptions, overrides, sceneFilter }: CanvasPropertiesProps) => {
  const { projection, atoms, nodeRegistry, capabilities, store } = useCanvasServices('Canvas.Properties');
  const selection = useAtomValue(useCanvasSelection('Canvas.Properties').atoms.selection);
  const path = useAtomValue(useCanvasNavigation('Canvas.Properties').atoms.path);
  const scenes = useAtomValue(store.scenes);
  const options = useMemo(() => sceneOptions(scenes, path, sceneFilter), [scenes, path, sceneFilter]);

  // With nothing selected there is nothing to edit, so the section goes, docked or floating.
  if (selection.size === 0) {
    return null;
  }
  return (
    <InspectorSection section={PROPERTIES_INSPECTOR}>
      <PropertiesInspector
        projection={projection}
        atoms={atoms}
        nodes={nodeRegistry}
        fields={fields}
        db={db}
        getOptions={getOptions}
        overrides={overrides}
        sceneOptions={options}
        styles={store.styles}
        readonly={!capabilities.update}
      />
    </InspectorSection>
  );
};

CanvasProperties.displayName = 'Canvas.Properties';

//
// Selection actions
//

export type UseSelectionActionsOptions = {
  scene: Scene;
  selection: ReadonlySet<ElementId>;
  store: SceneStore;
  capabilities: Capabilities;
  readonly: boolean;
  controller: CanvasController;
};

/** Commands on the selection, at the start of the inspector panel's toolbar; none when none applies. */
export const useSelectionActions = ({
  scene,
  selection,
  store,
  capabilities,
  readonly,
  controller,
}: UseSelectionActionsOptions): ReactNode => {
  const selectedElements = [...selection].flatMap((id) => getElement(scene, id) ?? []);
  const canGroup =
    capabilities.create &&
    capabilities.delete &&
    selectedElements.length > 1 &&
    selectedElements.some((element) => !isLink(element));
  const canClass = store.styles !== undefined && capabilities.update && selectedElements.length === 1;
  return readonly || (!canGroup && !canClass) ? undefined : (
    <>
      {canGroup && (
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--frame-corners--regular'
          label='New scene from selection'
          data-testid='inspector-group'
          onClick={controller.selection.group}
        />
      )}
      {canClass && (
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--swatches--regular'
          label='New class from selection'
          data-testid='inspector-new-class'
          onClick={controller.selection.classFrom}
        />
      )}
    </>
  );
};

//
// Inspectors
//

const PROPERTIES_INSPECTOR: InspectorSectionDef = {
  id: 'properties',
  title: 'Properties',
  icon: 'ph--sliders-horizontal--regular',
  order: 0,
  show: 'selection',
  defaultOpen: true,
};

// The hierarchy is a dock section only (VIEWS.md §4), as it is as tall as the drawing.
const VIEWS_INSPECTOR: InspectorSectionDef = {
  id: 'views',
  title: 'Views',
  icon: 'ph--tree-structure--regular',
  order: 1,
  show: 'never',
};

// Floating, the layers take the properties' place while nothing is selected.
const LAYERS_INSPECTOR: InspectorSectionDef = {
  id: 'layers',
  title: 'Layers',
  icon: 'ph--stack--regular',
  order: 2,
  show: 'empty',
};

// Docked beside the layers (ANIMATION.md §4.3).
const OBJECTS_INSPECTOR: InspectorSectionDef = {
  id: 'objects',
  title: 'Objects',
  icon: 'ph--cube--regular',
  order: 3,
  show: 'never',
};

// The counts are a dock section only, so a floating or read-only view shows none.
const ABOUT_INSPECTOR: InspectorSectionDef = {
  id: 'about',
  title: 'About',
  icon: 'ph--info--regular',
  order: 4,
  show: 'never',
};

//
// Views
//

/**
 * The hierarchy under the root (VIEWS.md §4): rows select on the canvas, opening their View first; a View row opens it;
 * a drag restacks a row among its siblings in the open View, as one intent.
 */
export const CanvasViews = () => {
  const { store, root, readonly, capabilities, intents } = useCanvasDocument('Canvas.Views');
  const navigation = useCanvasNavigation('Canvas.Views');
  const selection = useAtomValue(useCanvasSelection('Canvas.Views').atoms.selection);
  const path = useAtomValue(navigation.atoms.path);
  const isolation = useAtomValue(navigation.atoms.isolation);
  const scenes = useAtomValue(store.scenes);
  const { openView } = navigation.commands;
  return (
    <InspectorSection section={VIEWS_INSPECTOR}>
      <ViewsInspector
        scenes={scenes}
        root={root}
        path={isolation ? undefined : path}
        selected={selection}
        onSelect={({ path, ids }) => openView(path, { animate: false, select: ids })}
        onOpen={openView}
        onReorder={
          readonly || !capabilities.update
            ? undefined
            : ({ container, element, target, position }) => intents.restack(container, element, target, position)
        }
      />
    </InspectorSection>
  );
};

CanvasViews.displayName = 'Canvas.Views';

//
// Layers
//

/**
 * The current scene's layers: an inspector that floats where the properties go while nothing is selected (the two take
 * turns). Each edit is one intent, so one undo step.
 */
export const CanvasLayers = () => {
  const { registry, projection, atoms, capabilities } = useCanvasServices('Canvas.Layers');
  const scene = useAtomValue(projection.scene);
  const active = useAtomValue(atoms.layer);
  const layers = useMemo(() => sceneLayers(scene), [scene]);
  const readonly = !capabilities.update;
  const setLayer = useCallback((layer: Layer) => projection.apply({ kind: 'layer', layer }), [projection]);
  const byId = useCallback((id: LayerId) => layers.find((layer) => layer.id === id), [layers]);
  // The layers picked in the panel; the active layer (the top-most of them) is the one new shapes go on.
  const [picked, setPicked] = useState<LayerId[]>([]);
  const top = activeLayer(scene, active);
  const selected = useMemo(() => {
    const ids = picked.filter((id) => byId(id));
    return ids.includes(top) ? ids : [top];
  }, [picked, byId, top]);
  const select = useCallback(
    (ids: LayerId[]) => {
      setPicked(ids);
      const topMost = [...layers].reverse().find((layer) => ids.includes(layer.id));
      topMost && registry.set(atoms.layer, topMost.id);
    },
    [layers, registry, atoms],
  );
  return (
    <InspectorSection section={LAYERS_INSPECTOR}>
      <LayersInspector
        layers={layers}
        selected={selected}
        readonly={readonly}
        onSelectedChange={select}
        onToggle={(id) => {
          const layer = byId(id);
          layer && setLayer({ ...layer, hidden: !layer.hidden });
        }}
        onRename={(id, name) => {
          const layer = byId(id);
          layer && setLayer({ ...layer, name });
        }}
        onMove={(id, index) => {
          const layer = moveLayer(scene, id, index);
          layer && setLayer(layer);
        }}
        onCreate={() => {
          const layer = createLayer(scene, createId('layer'));
          setLayer(layer);
          select([layer.id]);
          return layer.id;
        }}
        onDelete={
          capabilities.delete
            ? (ids) => {
                projection.apply({ kind: 'batch', intents: ids.map((id): Intent => ({ kind: 'removeLayer', id })) });
                setPicked([]);
              }
            : undefined
        }
        onMerge={(ids, into) => {
          const merge = mergeLayersIntent(scene, ids, into);
          if (merge) {
            projection.apply(merge);
            select([into]);
          }
        }}
      />
    </InspectorSection>
  );
};

CanvasLayers.displayName = 'Canvas.Layers';

//
// Objects
//

/** Thumbnail box of an object row, in px. */
const THUMBNAIL = { width: 40, height: 24 };

/** A composite drawn small, read-only, fitted into a row's thumbnail. */
const ObjectThumbnail = ({ id }: { id: SceneId }) => {
  const { store, nodeRegistry } = useCanvasDocument('Canvas.Objects');
  const composite = useAtomValue(store.scene(id));
  const content = composite && compositeBounds(composite);
  if (!composite || !content) {
    return null;
  }
  const scale = Math.min(THUMBNAIL.width / content.width, THUMBNAIL.height / content.height) * 0.85;
  const x = THUMBNAIL.width / 2 - (content.x + content.width / 2) * scale;
  const y = THUMBNAIL.height / 2 - (content.y + content.height / 2) * scale;
  return (
    <div
      className='absolute pointer-events-none'
      style={{ transform: `translate(${x}px, ${y}px) scale(${scale})`, transformOrigin: '0 0' }}
    >
      <SceneLayer store={store} scene={composite} registry={nodeRegistry} zoom={scale} depth={1} liveDepth={1} />
    </div>
  );
};

/** The drawing's composite objects: a docked inspector beside the layers. */
export const CanvasObjects = () => {
  const {
    store,
    projection,
    readonly,
    capabilities,
    baseProjection,
    timeline: timelineAtom,
  } = useCanvasDocument('Canvas.Objects');
  const { objectActions } = useCanvasServices('Canvas.Objects');
  const navigation = useCanvasNavigation('Canvas.Objects');
  const selection = useAtomValue(useCanvasSelection('Canvas.Objects').atoms.selection);
  const isolation = useAtomValue(navigation.atoms.isolation);
  const timeline = useAtomValue(timelineAtom);
  // The scene as stored rather than as a gesture draws it: a gesture never changes which object an instance shows.
  const scene = useAtomValue(projection.scene);
  const scenes = useAtomValue(store.scenes);
  const objects = useMemo(() => {
    const counts = instanceCounts(scenes);
    return compositeScenes(scenes).map((scene) => ({
      id: scene.id,
      name: scene.name ?? scene.id,
      instances: counts[scene.id] ?? 0,
    }));
  }, [scenes]);
  // The open composite, else the one an instance on the canvas draws.
  const selected = useMemo(() => {
    if (isolation) {
      return isolation.composite;
    }
    const [only] = selection.size === 1 ? [...selection] : [];
    const node = only === undefined ? undefined : scene.nodes[only];
    return node && isInstanceNode(node) ? node.composite : undefined;
  }, [isolation, selection, scene]);
  const editable = capabilities.create === true && capabilities.delete === true;
  return (
    <InspectorSection section={OBJECTS_INSPECTOR}>
      <ObjectsInspector
        objects={objects}
        selected={selected}
        readonly={!editable}
        onSelect={navigation.commands.isolate}
        onRename={objectActions.rename}
        onCompose={selection.size > 0 && !isolation ? objectActions.compose : undefined}
        onPlace={isolation ? undefined : objectActions.place}
        onDuplicate={objectActions.duplicate}
        onDelete={objectActions.remove}
        thumbnail={(id) => <ObjectThumbnail id={id} />}
        onAnimate={
          timeline || readonly || !capabilities.update
            ? undefined
            : () => baseProjection.apply({ kind: 'timeline', timeline: createTimeline() })
        }
      />
    </InspectorSection>
  );
};

CanvasObjects.displayName = 'Canvas.Objects';

//
// About
//

/** Counts of the scene's objects and the drawing's scenes: an inspector that never floats. */
export const CanvasAbout = () => {
  const { store, projection } = useCanvasDocument('Canvas.About');
  const scene = useAtomValue(projection.scene);
  const scenes = useAtomValue(store.scenes);
  const stats = useMemo<AboutStat[]>(
    () => [
      { id: 'nodes', label: 'Nodes', value: Object.keys(scene.nodes).length },
      { id: 'links', label: 'Links', value: Object.keys(scene.links).length },
      { id: 'layers', label: 'Layers', value: Object.keys(scene.layers ?? {}).length },
      { id: 'scenes', label: 'Scenes', value: Object.keys(scenes).length },
    ],
    [scene, scenes],
  );
  return (
    <InspectorSection section={ABOUT_INSPECTOR}>
      <AboutInspector stats={stats} />
    </InspectorSection>
  );
};

CanvasAbout.displayName = 'Canvas.About';
