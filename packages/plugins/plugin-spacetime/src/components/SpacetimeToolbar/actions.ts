//
// Copyright 2026 DXOS.org
//

import {
  type ActionGraphProps,
  type ActionGroupBuilderFn,
  type ToolbarMenuActionGroupProperties,
  createMenuAction,
} from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { type Model } from '../../types';

/** Icons for each primitive type. */
const primitiveIcons: Record<Model.PrimitiveType, string> = {
  cube: 'ph--cube--regular',
  sphere: 'ph--globe--regular',
  cylinder: 'ph--cylinder--regular',
  cone: 'ph--cone--regular',
  pyramid: 'ph--triangle--regular',
};

export type EditorActions = {
  onAddObject: () => void;
  onDeleteSelected: () => void;
  onImportGLB: () => void;
  onExportSTL: () => void;
};

/** Creates the primitive type dropdown for selecting which shape the add button creates. */
export const createPrimitiveSelector = (
  selectedPrimitive: Model.PrimitiveType,
  onPrimitiveChange: (primitive: Model.PrimitiveType) => void,
): ActionGroupBuilderFn => (builder) => {
  builder.group(
    'primitive',
    {
      label: ['primitive.label', { ns: meta.id }],
      icon: primitiveIcons[selectedPrimitive],
      iconOnly: true,
      variant: 'dropdownMenu',
      applyActive: true,
      selectCardinality: 'single',
      value: selectedPrimitive,
    } as ToolbarMenuActionGroupProperties,
    (group) => {
      for (const [primitive, icon] of Object.entries(primitiveIcons)) {
        group.action(
          `primitive-${primitive}`,
          {
            label: [`primitive.${primitive}.label`, { ns: meta.id }],
            icon,
            checked: primitive === selectedPrimitive,
          },
          () => onPrimitiveChange(primitive as Model.PrimitiveType),
        );
      }
    },
  );
};

/** Creates standalone action buttons for the toolbar. */
export const createEditorActions = (actions: EditorActions): ActionGraphProps => {
  return {
    nodes: [
      createMenuAction('add-object', actions.onAddObject, {
        label: ['action.add-object.label', { ns: meta.id }],
        icon: 'ph--plus--regular',
      }),
      createMenuAction('delete-object', actions.onDeleteSelected, {
        label: ['action.delete-object.label', { ns: meta.id }],
        icon: 'ph--trash--regular',
      }),
      createMenuAction('import-glb', actions.onImportGLB, {
        label: ['action.import-glb.label', { ns: meta.id }],
        icon: 'ph--upload-simple--regular',
      }),
      createMenuAction('export-stl', actions.onExportSTL, {
        label: ['action.export-stl.label', { ns: meta.id }],
        icon: 'ph--download-simple--regular',
      }),
    ],
    edges: [
      { source: 'root', target: 'add-object', relation: 'child' },
      { source: 'root', target: 'delete-object', relation: 'child' },
      { source: 'root', target: 'import-glb', relation: 'child' },
      { source: 'root', target: 'export-stl', relation: 'child' },
    ],
  };
};
