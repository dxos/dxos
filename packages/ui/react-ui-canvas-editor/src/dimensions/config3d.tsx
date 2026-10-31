//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React from 'react';

import { exportSTL, fitCamera, importMesh, loadManifold, zoomBy, zoomPercent } from '@dxos/react-ui-canvas/3d';
import { type NamedStyle3D, Scene, bounds3D, findLayout, resolveLayout3D } from '@dxos/scene';

import { faceName } from '../components/index.ts';
import { type DimensionConfig, type EditorCatalog, type ExtraCommandDef, createPropertyForm } from '../editor/index.ts';
import {
  ELEMENT_FORM_FIELDS,
  ELEMENT_FORM_OVERRIDES,
  ElementForm,
  elementFormIntents,
  elementFormValues,
} from './element-form.ts';
import { TOOLS_3D } from './tools3d.ts';
import { Viewport3D } from './Viewport3D.tsx';

const NEU_STYLES = {
  body: { name: 'Body', hue: 'neutral' } satisfies NamedStyle3D,
  accent: { name: 'Accent', hue: 'blue' } satisfies NamedStyle3D,
  ghost: { name: 'Ghost', hue: 'violet', surface: 'tint' } satisfies NamedStyle3D,
};

/** The 3D looks, each a default style catalog: CAD's flat parts, Presentation's lit materials, Neu's matte solids. */
export const CATALOGS_3D: readonly EditorCatalog[] = [
  {
    id: 'cad',
    name: 'CAD',
    styles: {
      part: { name: 'Part', hue: 'neutral', border: true } satisfies NamedStyle3D,
      highlight: { name: 'Highlight', hue: 'amber', border: true } satisfies NamedStyle3D,
      clearance: { name: 'Clearance', hue: 'sky', surface: 'glass' } satisfies NamedStyle3D,
    },
  },
  {
    id: 'presentation',
    name: 'Presentation',
    styles: {
      metal: { name: 'Metal', hue: 'neutral', metalness: 0.9, roughness: 0.3 } satisfies NamedStyle3D,
      glass: { name: 'Glass', hue: 'sky', surface: 'glass' } satisfies NamedStyle3D,
      glow: { name: 'Glow', hue: 'amber', emissive: 0.8 } satisfies NamedStyle3D,
    },
  },
  // Each Neu look is held in its mode whatever the app's, as 2D's are.
  {
    id: 'neu-light',
    name: 'Neu Light',
    styles: NEU_STYLES,
  },
  {
    id: 'neu-dark',
    name: 'Neu Dark',
    styles: NEU_STYLES,
  },
];

const isElement3D = Schema.is(Scene.Element3D);

/** The 3D Properties form: centre, rotation and scale as vectors, then label, layer and style. */
const PropertyForm3D = createPropertyForm({
  schema: ElementForm,
  fields: ELEMENT_FORM_FIELDS,
  overrides: ELEMENT_FORM_OVERRIDES,
  accepts: (element): element is Scene.Element3D => isElement3D(element),
  values: elementFormValues,
  intents: elementFormIntents,
});

/** The first id of the form `base-n` a layout does not use. */
const freeId = (elements: Readonly<Record<string, unknown>>, base: string): string => {
  let index = 1;
  while (elements[`${base}-${index}`] !== undefined) {
    index++;
  }
  return `${base}-${index}`;
};

/** Opens the browser's file picker for one mesh file; resolves undefined when nothing was picked. */
const pickMeshFile = (): Promise<File | undefined> =>
  new Promise((resolve) => {
    const input = globalThis.document.createElement('input');
    input.type = 'file';
    input.accept = '.obj,.glb';
    input.onchange = () => resolve(input.files?.[0]);
    input.oncancel = () => resolve(undefined);
    input.click();
  });

/** Saves `blob` as `name` through a temporary link. */
const download = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

/** The commands only 3D offers: solid booleans, STL export, and mesh import (offered by the Objects section). */
const COMMANDS_3D: readonly ExtraCommandDef[] = [
  {
    id: 'join',
    label: 'Join',
    icon: 'ph--unite--regular',
    enabled: ({ selection }) => selection.length > 1,
    run: ({ document, layout, selection, onIntent, select }) => {
      const id = freeId(findLayout(document, layout)?.elements ?? {}, 'union');
      onIntent(layout, { kind: 'join', id, operands: selection });
      select([id]);
    },
  },
  {
    id: 'subtract',
    label: 'Subtract',
    icon: 'ph--subtract--regular',
    // The first selected is the base, the second the tool cut from it.
    enabled: ({ selection }) => selection.length === 2,
    run: ({ document, layout, selection, onIntent, select }) => {
      const [base, tool] = selection;
      if (base && tool) {
        const id = freeId(findLayout(document, layout)?.elements ?? {}, 'difference');
        onIntent(layout, { kind: 'subtract', id, base, tool });
        select([id]);
      }
    },
  },
  {
    id: 'export-stl',
    label: 'Export STL',
    icon: 'ph--download-simple--regular',
    enabled: () => true,
    // The selection as drawn, or every visible element when nothing is selected.
    run: async ({ document, layout, selection }) => {
      const wasm = await loadManifold();
      const buffer = exportSTL(document, layout, selection.length > 0 ? selection : undefined, wasm);
      download(new Blob([buffer], { type: 'model/stl' }), `${layout}.stl`);
    },
  },
  {
    id: 'import',
    label: 'Import mesh',
    icon: 'ph--upload-simple--regular',
    enabled: () => true,
    // A mesh is defined once in the model and then placed, so placing it again stores no more triangles.
    run: async ({ document, onModelIntent, setTool, notify }) => {
      const model = document.models[0];
      const file = await pickMeshFile();
      if (!file || !model) {
        return;
      }
      const exit = await Effect.runPromiseExit(importMesh(file));
      if (exit._tag !== 'Success') {
        notify(`Could not import "${file.name}".`);
        return;
      }
      const id = freeId(model.objects, exit.value.id);
      onModelIntent({ kind: 'define', model: model.id, object: { ...exit.value, id } }).length === 0 &&
        setTool({ id: 'place', object: id });
    },
  },
];

/** The 3D editor's dimension: Babylon's viewport, the 3D tools and maths, and the 3D property form. */
export const config3d: DimensionConfig<Scene.Camera3D> = {
  dim: '3d',
  viewport: Viewport3D,
  tools: TOOLS_3D,
  // A paste lands a grid unit further along each ground axis; a gizmo snaps to the unit, 15 degrees and a tenth.
  geometry: { pasteOffset: (pasted) => ({ x: pasted, y: 0, z: pasted }), snap: { move: 1, rotate: 15, scale: 0.1 } },
  camera: {
    fit: (camera, document, layout, size) => {
      const record = findLayout(document, layout);
      const elements = record?.dim === '3d' ? resolveLayout3D(document, record) : {};
      return fitCamera(camera, bounds3D(elements), size);
    },
    reset: (authored, document, layout) => {
      const record = findLayout(document, layout);
      const bounds = bounds3D(record?.dim === '3d' ? resolveLayout3D(document, record) : {});
      return bounds.radius > 0 ? { ...authored, target: { ...bounds.center } } : authored;
    },
    zoom: zoomBy,
    percent: zoomPercent,
  },
  display: {
    themes: CATALOGS_3D.map(({ id, name }) => ({ id, label: name })),
    grids: ['lines'],
    guides: false,
  },
  propertyForm: PropertyForm3D,
  propertyInfo: ({ face }) =>
    face ? (
      <p className='px-2 pt-2 text-sm text-fg-muted' data-testid='properties-face'>
        Face: {faceName(face.normal)}
      </p>
    ) : null,
  commands: COMMANDS_3D,
};
