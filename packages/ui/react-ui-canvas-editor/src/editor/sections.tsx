//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo, useState } from 'react';

import { type ThemeMode, between } from '@dxos/react-ui-canvas';
import {
  type Layer,
  type NamedStyle,
  type NamedStyle2D,
  type NamedStyle3D,
  type Scene,
  findLayout,
  resolveLayout,
} from '@dxos/scene';

import {
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
  propertiesShown,
} from '../components/index.ts';
import { useSceneEditor } from './context.ts';
import { layersOf, layoutTree, objectEntries } from './scene-rows.ts';

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
  const { document, layout } = useSceneEditor(consumer);
  return layout === undefined ? undefined : findLayout(document, layout);
};

/**
 * Properties: the config's form over the one selected element, with the dimension's line above it (3D: the face). The
 * form shows the element as drawn, its object's size, type and look applied, so a field it inherits is not blank.
 */
export const PropertiesSection = () => {
  const { config, document, store, readonly, docked, layout, onIntent } = useSceneEditor('SceneEditor.Properties');
  const selection = useAtomValue(store.atoms.selection);
  const face = useAtomValue(store.atoms.face);
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
          onIntents={(intents) => intents.length > 0 && onIntent(layout, { kind: 'batch', intents })}
        />
      </LayersContext.Provider>
    </InspectorSection>
  );
};

/** Views: the scene's layout tree, with a composite's parts under it; a row selects, a composite row drills in. */
export const ViewsSection = () => {
  const { document, scene, store, readonly, rootLayout, sceneChoice } = useSceneEditor('SceneEditor.Views');
  const selection = useAtomValue(store.atoms.selection);
  const path = useAtomValue(store.atoms.editing);
  const record = document.scenes.find((entry) => entry.id === scene);
  const tree = useMemo(() => layoutTree(document, record), [document, record]);
  const open = (layout: string | undefined) =>
    store.open(layout === undefined || layout === rootLayout ? [] : [rootLayout ?? '', layout]);
  return (
    <InspectorSection section={VIEWS_INSPECTOR}>
      <ViewsInspector
        sceneChoice={sceneChoice}
        readonly={readonly}
        tree={tree}
        selected={new Set(selection)}
        place={{ path: rootLayout === undefined ? [] : path.length > 0 ? [...path] : [rootLayout] }}
        onSelect={(next) => {
          open(next.path.at(-1));
          store.select(next.ids);
        }}
        onOpen={(next) => open(next.at(-1))}
      />
    </InspectorSection>
  );
};

/** Objects: the model's objects; place one with the place tool, open a composite's parts, or make one of the selection. */
export const ObjectsSection = () => {
  const { document, store, readonly, rootLayout, commands, onIntent, onModelIntent } =
    useSceneEditor('SceneEditor.Objects');
  const entries = useMemo(() => objectEntries(document), [document]);
  const model = document.models[0]?.id;
  const objects = document.models[0]?.objects ?? {};
  const importCommand = commands.get('import');
  const [current, setCurrent] = useState<string>();
  return (
    <InspectorSection section={OBJECTS_INSPECTOR}>
      <ObjectsInspector
        objects={entries}
        selected={current}
        readonly={readonly}
        onPlace={(id) => store.setTool({ id: 'place', object: id })}
        onMakeObject={() => commands.get('make-object')?.run()}
        canMakeObject={commands.get('make-object')?.enabled ?? false}
        onImport={importCommand?.enabled ? importCommand.run : undefined}
        onSelect={(id) => {
          // A click picks the object; a click on the picked one opens a composite's parts.
          const parts = objects[id]?.parts;
          current === id && parts !== undefined && store.open(parts === rootLayout ? [] : [rootLayout ?? '', parts]);
          setCurrent(id);
        }}
        onDelete={
          model === undefined || !onModelIntent
            ? undefined
            : (id, instances) => {
                if (instances) {
                  for (const layout of document.layouts) {
                    const ids = Object.values(layout.elements)
                      .filter((element) => element.object === id)
                      .map((element) => element.id);
                    ids.length > 0 && onIntent(layout.id, { kind: 'delete', ids });
                  }
                }
                onModelIntent({ kind: 'remove', model, id });
              }
        }
      />
    </InspectorSection>
  );
};

/** Layers: the open layout's layers; a hidden one's elements are neither drawn nor picked. */
export const LayersSection = () => {
  const { readonly, layout, onLayersChange } = useSceneEditor('SceneEditor.Layers');
  const record = useOpenLayout('SceneEditor.Layers');
  const layers = useMemo(() => (record ? layersOf(record) : []), [record]);
  const write = (next: readonly Layer[]) => layout !== undefined && onLayersChange?.(layout, next);
  return (
    <InspectorSection section={LAYERS_INSPECTOR}>
      <LayersInspector
        layers={layers}
        readonly={readonly || !onLayersChange}
        onToggle={(id) => write(layers.map((layer) => (layer.id === id ? { ...layer, hidden: !layer.hidden } : layer)))}
        onRename={(id, name) => write(layers.map((layer) => (layer.id === id ? { ...layer, name } : layer)))}
        onCreate={() => {
          const id = `layer-${layers.length + 1}`;
          write([...layers, { id, name: `Layer ${layers.length + 1}`, z: between(layers.at(-1)?.z) }]);
          return id;
        }}
        onDelete={(ids) => write(layers.filter((layer) => !ids.includes(layer.id)))}
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
  const { document, store, readonly, layout, onIntent, onModelIntent } = useSceneEditor('SceneEditor.Styles');
  const selection = useAtomValue(store.atoms.selection);
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
      if (!onModelIntent || onModelIntent({ kind: 'style', model: model.id, id, style: adopted }).length > 0) {
        return;
      }
    }
    onIntent(layout, {
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
          model === undefined || !onModelIntent || layout === undefined
            ? undefined
            : () => {
                const [first] = selected;
                if (!first) {
                  return;
                }
                const id = freeStyleKey(modelStyles);
                const style = { name: `Style ${Object.keys(modelStyles).length + 1}`, ...first.overrides };
                onModelIntent({ kind: 'style', model: model.id, id, style }).length === 0 &&
                  onIntent(layout, {
                    kind: 'batch',
                    intents: selected.flatMap((element) => [
                      { kind: 'update' as const, id: element.id, path: ['style'], value: id },
                      { kind: 'update' as const, id: element.id, path: ['overrides'], value: undefined },
                    ]),
                  });
              }
        }
        onDelete={
          model === undefined || !onModelIntent
            ? undefined
            : (id) => onModelIntent({ kind: 'style', model: model.id, id })
        }
      />
    </InspectorSection>
  );
};

/** The shared inspector sections, then the dimension's own. */
export const SceneEditorInspector = ({ catalogs }: { catalogs?: readonly EditorCatalog[] }) => {
  const { config } = useSceneEditor('SceneEditor.Inspector');
  return (
    <>
      <PropertiesSection />
      <ViewsSection />
      <ObjectsSection />
      <LayersSection />
      <StylesSection catalogs={catalogs} />
      {config.sections?.map(({ section, render }) => (
        <InspectorSection key={section.id} section={section}>
          {render()}
        </InspectorSection>
      ))}
    </>
  );
};

SceneEditorInspector.displayName = 'SceneEditor.Inspector';
