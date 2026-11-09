//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, { useContext, useMemo, useState } from 'react';

import { type ThemeMode, between, latticeGrid } from '@dxos/react-ui-canvas';
import { Form, type FormFieldMap } from '@dxos/react-ui-form';
import {
  DEFAULT_GRID,
  MAJOR_GRID_RATIO,
  type Layer,
  type NamedStyle,
  type NamedStyle2D,
  type NamedStyle3D,
  type Scene,
  findLayout,
  resolveLayout,
} from '@dxos/scene';

import {
  InspectorPanel,
  InspectorSection,
  type InspectorSectionDef,
  LAYERS_INSPECTOR,
  LayersContext,
  LayersInspector,
  OBJECTS_INSPECTOR,
  ObjectsInspector,
  PROPERTIES_INSPECTOR,
  PropertiesEmpty,
  type StyleEntry,
  StylesInspector,
  VIEWS_INSPECTOR,
  ViewsInspector,
  makeGeometryField,
  propertiesShown,
} from '../components/index.ts';
import { type ObjectEntry } from '../components/index.ts';
import {
  useSceneCommands,
  useSceneDocument,
  useSceneNavigation,
  useSceneSelection,
  useSceneServices,
  useSceneTools,
} from './aspects/index.ts';
import {
  DEFAULT_LATTICE,
  type DrawingValues,
  drawingOverrides,
  drawingSchema,
  drawingWrites,
  latticeGutterType,
  latticeValues,
} from './drawing-form.ts';
import {
  duplicateObject,
  layersOf,
  layoutTree,
  mergedLayers,
  movedLayers,
  objectEntries,
  restackIntent,
} from './scene-rows.ts';

const NO_LAYERS = Atom.make<readonly Layer[]>([]);
const NO_OBJECTS = Atom.make<readonly ObjectEntry[]>([]);
const NO_PICK = Atom.make<string | undefined>(undefined);

/** The lattice's cell, with its gutter drawn beside it, as the Properties form draws an element's centre and size. */
const DRAWING_FIELDS: FormFieldMap = {
  cell: makeGeometryField({ name: 'gutter', label: 'Gutter', type: latticeGutterType }),
};

export const DRAWING_INSPECTOR: InspectorSectionDef = {
  id: 'drawing',
  title: 'Drawing',
  icon: 'ph--compass-tool--regular',
  order: 5,
};

export const STYLES_INSPECTOR: InspectorSectionDef = {
  id: 'styles',
  title: 'Styles',
  icon: 'ph--palette--regular',
  order: 4,
};

/** A shared catalog's named styles, as the Styles section lists them after the drawing's own (themes are catalogs). */
export type EditorCatalog = {
  id: string;
  name: string;
  /** The mode the look holds whatever the app's. */
  mode?: ThemeMode;
  styles: Readonly<Record<string, NamedStyle2D | NamedStyle3D>>;
};

/** The open layout's record. */
const useOpenLayout = (consumer: string): Scene.LayoutRecord | undefined => {
  const { atoms } = useSceneDocument(consumer);
  const document = useAtomValue(atoms.document);
  const layout = useAtomValue(atoms.layout);
  return layout === undefined ? undefined : findLayout(document, layout);
};

/**
 * Properties: the config's form over the one selected element, with the dimension's line above it (3D: the face). The
 * form shows the element as drawn, its object's size, type and look applied, so a field it inherits is not blank.
 */
export const PropertiesSection = () => {
  const { config, atoms, commands } = useSceneDocument('SceneEditor.Properties');
  const document = useAtomValue(atoms.document);
  const layout = useAtomValue(atoms.layout);
  const readonly = useAtomValue(atoms.readonly);
  const docked = InspectorPanel.useDocked();
  const { atoms: selectionAtoms } = useSceneSelection('SceneEditor.Properties');
  const selection = useAtomValue(selectionAtoms.selection);
  const face = useAtomValue(selectionAtoms.face);
  const record = useOpenLayout('SceneEditor.Properties');
  // A form over a whole selection is given the first element; any other shows only for one.
  const id =
    selection.length === 1 || (config.propertyFormSelection && selection.length > 0) ? selection[0] : undefined;
  const element = useMemo(
    () => (record && id !== undefined && record.elements[id] ? resolveLayout(document, record)[id] : undefined),
    [document, record, id],
  );
  const layers = useMemo(() => (record ? layersOf(record) : []), [record]);
  const Form = config.propertyForm;
  if (!element || layout === undefined) {
    return propertiesShown({ docked, selected: false }) === 'empty' ? <PropertiesEmpty /> : null;
  }
  return (
    <InspectorSection section={PROPERTIES_INSPECTOR}>
      {config.propertyInfo?.({ face })}
      <LayersContext.Provider value={layers}>
        <Form
          key={element.id}
          element={element}
          readonly={readonly}
          onIntents={(intents) => intents.length > 0 && commands.intent(layout, { kind: 'batch', intents })}
        />
      </LayersContext.Provider>
    </InspectorSection>
  );
};

/** Views: the scene's layout tree; a row selects at its place (a composite's part inside the composite on its own), a View row opens. */
export const ViewsSection = () => {
  const { atoms, commands } = useSceneDocument('SceneEditor.Views');
  const navigation = useSceneNavigation('SceneEditor.Views');
  const selection = useSceneSelection('SceneEditor.Views');
  const document = useAtomValue(atoms.document);
  const scene = useAtomValue(atoms.scene);
  const readonly = useAtomValue(atoms.readonly);
  const sceneChoice = useAtomValue(atoms.sceneChoice);
  const selected = useAtomValue(selection.atoms.selection);
  const place = useAtomValue(navigation.atoms.place);
  const record = document.scenes.find((entry) => entry.id === scene);
  const tree = useMemo(() => layoutTree(document, record), [document, record]);
  return (
    <InspectorSection section={VIEWS_INSPECTOR}>
      <ViewsInspector
        sceneChoice={sceneChoice}
        readonly={readonly}
        tree={tree}
        selected={new Set(selected)}
        place={place}
        onSelect={({ ids, ...next }) => navigation.commands.openPlace(next, ids)}
        onOpen={(path) => navigation.commands.open(path.length > 1 ? path : [])}
        onReorder={
          readonly
            ? undefined
            : ({ container, element, target, position }) => {
                const layout = findLayout(document, container);
                layout && commands.intent(container, restackIntent(layout, element, target, position));
              }
        }
      />
    </InspectorSection>
  );
};

/**
 * Objects: the model's objects (or those the dimension's engine keeps); place one with the place tool, open a
 * composite's parts, duplicate one, or make one of the selection.
 */
export const ObjectsSection = () => {
  const { atoms, commands } = useSceneDocument('SceneEditor.Objects');
  const navigation = useSceneNavigation('SceneEditor.Objects');
  const tools = useSceneTools('SceneEditor.Objects');
  const { inspector } = useSceneServices('SceneEditor.Objects');
  const engine = inspector?.objects;
  const document = useAtomValue(atoms.document);
  const readonly = useAtomValue(atoms.readonly);
  const rootLayout = useAtomValue(atoms.rootLayout);
  const offers = useAtomValue(atoms.host);
  const table = useAtomValue(useSceneCommands('SceneEditor.Objects').atoms.table);
  const engineObjects = useAtomValue(engine?.objects ?? NO_OBJECTS);
  const enginePick = useAtomValue(engine?.selected ?? NO_PICK);
  const entries = useMemo(() => (engine ? engineObjects : objectEntries(document)), [engine, engineObjects, document]);
  const model = document.models[0]?.id;
  const objects = document.models[0]?.objects ?? {};
  const importCommand = table.get('import');
  const [current, setCurrent] = useState<string>();
  const onModel = !engine && model !== undefined && offers.model;
  return (
    <InspectorSection section={OBJECTS_INSPECTOR}>
      <ObjectsInspector
        objects={entries}
        selected={engine ? enginePick : current}
        readonly={readonly}
        thumbnail={inspector?.thumbnail}
        onPlace={engine ? engine.place : (id) => tools.commands.setTool({ id: 'place', object: id })}
        onMakeObject={() => table.get('make-object')?.run()}
        canMakeObject={table.get('make-object')?.enabled ?? false}
        onImport={importCommand?.enabled ? importCommand.run : undefined}
        onRename={engine?.rename}
        onSelect={
          engine
            ? engine.select
            : (id) => {
                // A click picks the object; a click on the picked one opens a composite's parts.
                const parts = objects[id]?.parts;
                current === id &&
                  parts !== undefined &&
                  navigation.commands.open(parts === rootLayout ? [] : [rootLayout ?? '', parts]);
                setCurrent(id);
              }
        }
        onDuplicate={
          engine
            ? engine.duplicate
            : onModel
              ? (id) => {
                  const intent = duplicateObject(document, id);
                  intent && commands.modelIntent(intent);
                }
              : undefined
        }
        onDelete={
          engine
            ? engine.remove
            : model === undefined || !offers.model
              ? undefined
              : (id, instances) => {
                  if (instances) {
                    for (const layout of document.layouts) {
                      const ids = Object.values(layout.elements)
                        .filter((element) => element.object === id)
                        .map((element) => element.id);
                      ids.length > 0 && commands.intent(layout.id, { kind: 'delete', ids });
                    }
                  }
                  commands.modelIntent({ kind: 'remove', model, id });
                }
        }
      />
    </InspectorSection>
  );
};

/**
 * Layers: the open layout's layers (or those the dimension's engine keeps); a hidden one's elements are neither drawn
 * nor picked. Several may be picked to merge; the top-most picked is where new shapes go.
 */
export const LayersSection = () => {
  const registry = useContext(RegistryContext);
  const { atoms, commands } = useSceneDocument('SceneEditor.Layers');
  const { inspector } = useSceneServices('SceneEditor.Layers');
  const engine = inspector?.layers;
  const readonly = useAtomValue(atoms.readonly);
  const layout = useAtomValue(atoms.layout);
  const offers = useAtomValue(atoms.host);
  const record = useOpenLayout('SceneEditor.Layers');
  const engineLayers = useAtomValue(engine?.layers ?? NO_LAYERS);
  const active = useAtomValue(inspector?.activeLayer ?? NO_PICK);
  const layers = useMemo(
    () => (engine ? [...engineLayers] : record ? layersOf(record) : []),
    [engine, engineLayers, record],
  );
  const [picked, setPicked] = useState<string[]>([]);
  const selected = useMemo(() => {
    const ids = picked.filter((id) => layers.some((layer) => layer.id === id));
    // The active layer when the layout has it, else the top one, as new shapes go there.
    const top = layers.find((layer) => layer.id === active)?.id ?? layers.at(-1)?.id;
    return ids.length > 0 ? ids : top !== undefined ? [top] : [];
  }, [picked, layers, active]);
  const write = (next: readonly Layer[]) =>
    engine ? engine.write(next) : layout !== undefined && commands.setLayers(layout, next);
  const select = (ids: string[]) => {
    setPicked(ids);
    const top = [...layers].reverse().find((layer) => ids.includes(layer.id));
    top && inspector?.activeLayer && registry.set(inspector.activeLayer, top.id);
  };
  const byId = (id: string) => layers.find((layer) => layer.id === id);
  return (
    <InspectorSection section={LAYERS_INSPECTOR}>
      <LayersInspector
        layers={layers}
        selected={selected}
        readonly={readonly || (!engine && !offers.layers)}
        onSelectedChange={select}
        onToggle={(id) => write(layers.map((layer) => (layer.id === id ? { ...layer, hidden: !layer.hidden } : layer)))}
        onRename={(id, name) => write(layers.map((layer) => (layer.id === id ? { ...layer, name } : layer)))}
        onMove={(id, index) => write(movedLayers(layers, id, index))}
        onCreate={() => {
          let index = layers.length + 1;
          while (byId(`layer-${index}`)) {
            index++;
          }
          const id = `layer-${index}`;
          write([...layers, { id, name: `Layer ${index}`, z: between(layers.at(-1)?.z) }]);
          select([id]);
          return id;
        }}
        onDelete={(ids) => {
          write(layers.filter((layer) => !ids.includes(layer.id)));
          setPicked([]);
        }}
        onMerge={(ids, into) => {
          if (engine) {
            engine.merge(ids, into);
          } else if (record && layout !== undefined) {
            const merge = mergedLayers(record, ids, into);
            commands.intent(layout, merge.intent);
            commands.setLayers(layout, merge.layers);
          }
          select([into]);
        }}
      />
    </InspectorSection>
  );
};

/** The first free `style-n` key of a model's styles. */
const freeStyleKey = (styles: Readonly<Record<string, unknown>>): string => {
  let index = 1;
  while (styles[`style-${index}`] !== undefined) {
    index++;
  }
  return `style-${index}`;
};

/**
 * Styles: the drawing's named styles, then the catalogs'. Applying one sets the selection's `style`; a new style takes
 * the selected element's own look (its overrides) into the model and points the element at it.
 */
export const StylesSection = ({ catalogs = [] }: { catalogs?: readonly EditorCatalog[] }) => {
  const { atoms, commands } = useSceneDocument('SceneEditor.Styles');
  const document = useAtomValue(atoms.document);
  const readonly = useAtomValue(atoms.readonly);
  const layout = useAtomValue(atoms.layout);
  const offers = useAtomValue(atoms.host);
  const selection = useAtomValue(useSceneSelection('SceneEditor.Styles').atoms.selection);
  const record = useOpenLayout('SceneEditor.Styles');
  const model = document.models[0];
  const modelStyles: Readonly<Record<string, NamedStyle<{ hue?: string }>>> = model?.styles ?? {};
  const entries = useMemo<StyleEntry[]>(
    () => [
      ...Object.entries(modelStyles).map(([id, style]) => ({
        id,
        name: style.name ?? id,
        source: 'model',
        hue: style.hue,
      })),
      ...catalogs.flatMap((catalog) =>
        Object.entries(catalog.styles).map(([key, style]) => ({
          id: `${catalog.id}:${key}`,
          name: style.name ?? key,
          source: catalog.name,
          hue: style.hue,
        })),
      ),
    ],
    [modelStyles, catalogs],
  );
  const selected = record ? selection.flatMap((id) => record.elements[id] ?? []) : [];
  const styles = new Set(selected.map((element) => element.style));
  const current = styles.size === 1 ? [...styles][0] : undefined;
  const apply = (id: string | undefined) => {
    if (layout === undefined || selected.length === 0) {
      return;
    }
    // A catalog's style is adopted into the drawing as it is first used, so the drawing resolves it on its own.
    const [catalogId, key] = id?.includes(':') ? id.split(':') : [];
    const adopted = catalogs.find((catalog) => catalog.id === catalogId)?.styles[key ?? ''];
    if (id !== undefined && adopted && model && modelStyles[id] === undefined) {
      if (!offers.model || commands.modelIntent({ kind: 'style', model: model.id, id, style: adopted }).length > 0) {
        return;
      }
    }
    commands.intent(layout, {
      kind: 'batch',
      intents: selected.map((element) => ({ kind: 'update' as const, id: element.id, path: ['style'], value: id })),
    });
  };
  return (
    <InspectorSection section={STYLES_INSPECTOR}>
      <StylesInspector
        styles={entries}
        current={current}
        hasSelection={selected.length > 0}
        readonly={readonly}
        onApply={apply}
        onCreateFromSelection={
          model === undefined || !offers.model || layout === undefined
            ? undefined
            : () => {
                const [first] = selected;
                if (!first) {
                  return;
                }
                const id = freeStyleKey(modelStyles);
                const style = { name: `Style ${Object.keys(modelStyles).length + 1}`, ...first.overrides };
                commands.modelIntent({ kind: 'style', model: model.id, id, style }).length === 0 &&
                  commands.intent(layout, {
                    kind: 'batch',
                    intents: selected.flatMap((element) => [
                      { kind: 'update' as const, id: element.id, path: ['style'], value: id },
                      { kind: 'update' as const, id: element.id, path: ['overrides'], value: undefined },
                    ]),
                  });
              }
        }
        onDelete={
          model === undefined || !offers.model
            ? undefined
            : (id) => commands.modelIntent({ kind: 'style', model: model.id, id })
        }
      />
    </InspectorSection>
  );
};

/**
 * Drawing: the whole drawing's properties, as a form — the look, the grid and the aids this viewer sees, and (in 2D)
 * the lattice the layout is laid out on, which is the document's own and so is written as an intent.
 */
/**
 * Drawing: the open layout's own properties — its grid pitch and whether it is laid out on a lattice. What this
 * viewer sees (the look, the grid drawn, snapping, guides and axes) is the display panel's, so it is not repeated here.
 */
export const DrawingSection = () => {
  const { atoms, commands } = useSceneDocument('SceneEditor.Drawing');
  const readonly = useAtomValue(atoms.readonly);
  const layout = useAtomValue(atoms.layout);
  const record = useOpenLayout('SceneEditor.Drawing');
  const drawing = record?.dim === '2d' ? record : undefined;
  const values = useMemo(
    (): DrawingValues => ({
      // The pitch in force, so the field is never blank: a layout without one draws on its lattice's grid or the default.
      grid: drawing?.grid ?? ((drawing?.lattice && latticeGrid(drawing.lattice, MAJOR_GRID_RATIO)) || DEFAULT_GRID),
      lattice: drawing?.lattice !== undefined,
      ...latticeValues(drawing?.lattice ?? DEFAULT_LATTICE),
    }),
    [drawing],
  );
  const overrides = useMemo(() => drawingOverrides({ lattice: values.lattice === true }), [values.lattice]);
  const onSave = (next: DrawingValues) => {
    const intents = drawingWrites(values, next);
    layout !== undefined &&
      intents.length > 0 &&
      commands.intent(layout, intents.length === 1 ? intents[0] : { kind: 'batch', intents });
  };
  // Only a 2D layout has a grid and a lattice; a 3D scene's drawing has nothing of its own to show.
  if (!drawing) {
    return null;
  }
  return (
    <InspectorSection section={DRAWING_INSPECTOR}>
      <Form.Root
        schema={drawingSchema}
        values={values}
        fieldOverrides={overrides}
        fieldMap={DRAWING_FIELDS}
        readonly={readonly}
        autoSave
        commitOn='blur'
        onSave={onSave}
      >
        <Form.Viewport scroll={false}>
          <Form.Content>
            <Form.Fields />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </InspectorSection>
  );
};

/** The shared inspector sections, then the dimension's own. */
export const SceneEditorInspector = ({ catalogs }: { catalogs?: readonly EditorCatalog[] }) => {
  const { config } = useSceneDocument('SceneEditor.Inspector');
  return (
    <>
      <PropertiesSection />
      <ViewsSection />
      <ObjectsSection />
      <LayersSection />
      <StylesSection catalogs={catalogs} />
      <DrawingSection />
      {config.sections?.map(({ section, render }) => (
        <InspectorSection key={section.id} section={section}>
          {render()}
        </InspectorSection>
      ))}
    </>
  );
};

SceneEditorInspector.displayName = 'SceneEditor.Inspector';
