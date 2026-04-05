//
// Copyright 2026 DXOS.org
//

import { type ActionGroupBuilderFn, type ToolbarMenuActionGroupProperties } from '@dxos/react-ui-menu';

import { meta } from '../../meta';
import { type Model } from '../../types';

/** Icons for each primitive type. */
const primitiveIcons: Record<Model.PrimitiveType, string> = {
  cube: 'ph--cube--regular',
  sphere: 'ph--sphere--regular',
  cylinder: 'ph--cylinder--regular',
  cone: 'ph--triangle--regular',
  pyramid: 'ph--triangle--regular',
};

export type EditorActions = {
  onAddObject: () => void;
  onDeleteSelected: () => void;
  onImport: () => void;
  onExportSTL: () => void;
};

/** Creates the primitive type dropdown. */
export const createPrimitiveSelector =
  (selectedPrimitive: Model.PrimitiveType, onPrimitiveChange: (primitive: Model.PrimitiveType) => void): ActionGroupBuilderFn =>
  (builder) => {
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
            { label: [`primitive.${primitive}.label`, { ns: meta.id }], icon, checked: primitive === selectedPrimitive },
            () => onPrimitiveChange(primitive as Model.PrimitiveType),
          );
        }
      },
    );
  };

/** Creates standalone action buttons. */
export const createEditorActions =
  (actions: EditorActions): ActionGroupBuilderFn =>
  (builder) => {
    builder.action('add-object', { label: ['action.add-object.label', { ns: meta.id }], icon: 'ph--plus--regular' }, actions.onAddObject);
    builder.action('delete-object', { label: ['action.delete-object.label', { ns: meta.id }], icon: 'ph--trash--regular' }, actions.onDeleteSelected);
    builder.action('import', { label: ['action.import.label', { ns: meta.id }], icon: 'ph--upload-simple--regular' }, actions.onImport);
    builder.action('export-stl', { label: ['action.export-stl.label', { ns: meta.id }], icon: 'ph--download-simple--regular' }, actions.onExportSTL);
  };
