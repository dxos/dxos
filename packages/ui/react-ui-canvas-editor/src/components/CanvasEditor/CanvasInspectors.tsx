//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import { useCanvasNavigation, useCanvasServices, viewOptions } from '@dxos/react-ui-canvas';
import { type ViewId } from '@dxos/scene';

import { PropertiesInspector, type PropertiesInspectorProps } from '../inspectors/index.ts';
import { InspectorSection, type InspectorSectionDef } from '../panels/index.ts';

//
// Properties
//

/** Where the inspectors (properties, layers, about) sit: floating over the canvas, or docked in a column beside it. */
export type InspectorMode = 'floating' | 'docked';

export type CanvasPropertiesProps = Pick<
  PropertiesInspectorProps,
  'fields' | 'db' | 'getOptions' | 'overrides' | 'groups' | 'onGroupsChange'
> & {
  /** Narrows the scenes a scene shape may open (e.g. to the host's own, not those it shows from elsewhere). */
  sceneFilter?: (id: ViewId) => boolean;
};

/**
 * The selection's properties form, without its section: the schema-driven form over each selected element's type
 * (ports, link ends, line type, a frame's object, role and the rest), read from the canvas it sits in. The shared scene
 * editor's 2D Properties section draws it too.
 */
export const CanvasPropertiesForm = ({
  fields,
  db,
  getOptions,
  overrides,
  groups,
  onGroupsChange,
  sceneFilter,
}: CanvasPropertiesProps) => {
  const { draw, atoms, nodeRegistry, capabilities, store, grid } = useCanvasServices('Canvas.PropertiesForm');
  const path = useAtomValue(useCanvasNavigation('Canvas.PropertiesForm').atoms.path);
  const scenes = useAtomValue(store.views);
  const options = useMemo(() => viewOptions(scenes, path, sceneFilter), [scenes, path, sceneFilter]);
  return (
    <PropertiesInspector
      draw={draw}
      atoms={atoms}
      nodes={nodeRegistry}
      fields={fields}
      db={db}
      getOptions={getOptions}
      overrides={overrides}
      viewOptions={options}
      styles={store.styles}
      grid={grid}
      groups={groups}
      onGroupsChange={onGroupsChange}
      readonly={!capabilities.update}
    />
  );
};

CanvasPropertiesForm.displayName = 'Canvas.PropertiesForm';

//
// Inspectors
//

/** The Properties section with nothing selected, as a docked panel shows it in every scene view. */
export const PropertiesEmpty = () => (
  <InspectorSection section={PROPERTIES_INSPECTOR}>
    <p className='p-2 text-sm text-fg-subtle' data-testid='properties-empty'>
      Nothing selected
    </p>
  </InspectorSection>
);

/** The Properties section, shared by every scene view so it stacks first, in the panel's upper half when docked. */
export const PROPERTIES_INSPECTOR: InspectorSectionDef = {
  id: 'properties',
  title: 'Properties',
  icon: 'ph--sliders-horizontal--regular',
  order: 0,
  pane: 'upper',
  defaultOpen: true,
};

/** Shared by both dimensions' scene views. */
export const VIEWS_INSPECTOR: InspectorSectionDef = {
  id: 'views',
  title: 'Views',
  icon: 'ph--tree-structure--regular',
  order: 1,
};

/** Shared by both dimensions' scene views. */
export const LAYERS_INSPECTOR: InspectorSectionDef = {
  id: 'layers',
  title: 'Layers',
  icon: 'ph--stack--regular',
  order: 3,
};

/** Shared by both dimensions' scene views. */
export const OBJECTS_INSPECTOR: InspectorSectionDef = {
  id: 'objects',
  title: 'Objects',
  icon: 'ph--cube--regular',
  order: 2,
};
