//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { GeometryField, LayerField, STYLE_FIELD_OVERRIDES, STYLE_FIELDS } from '@dxos/react-ui-canvas';
import { type FormFieldMap, type FormFieldOverride } from '@dxos/react-ui-form';
import { type LayoutIntent, NodeBase, Scene, Style2D } from '@dxos/scene';

/**
 * The fields a person edits in the 2D Properties form: geometry first (centre and size side by side, then rotation),
 * then label, layer and style, in the order the 3D form shows them.
 */
export const ElementForm2D = Schema.Struct({
  center: Schema.optional(NodeBase.fields.center),
  size: Schema.optional(NodeBase.fields.size),
  rotation: NodeBase.fields.rotation,
  label: Scene.Element2D.fields.label,
  layer: Scene.Element2D.fields.layer,
  style: Schema.optional(Style2D),
});
export type ElementForm2D = Schema.Schema.Type<typeof ElementForm2D>;

/** The style grid at `style.hue`, the layer picker, and centre and size in two columns. */
export const ELEMENT_FORM_2D_FIELDS: FormFieldMap = {
  ...STYLE_FIELDS,
  layer: LayerField,
  center: GeometryField,
};

/** Size is drawn beside the centre by `GeometryField`, so it has no row of its own. */
export const ELEMENT_FORM_2D_OVERRIDES: Record<string, FormFieldOverride> = {
  ...STYLE_FIELD_OVERRIDES,
  size: { hidden: true },
};

const FIELDS = ['center', 'size', 'rotation', 'label', 'layer'] as const;

/** The form's values for an element. */
export const elementForm2DValues = (element: Scene.Element2D): ElementForm2D => ({
  center: element.center,
  size: element.size,
  rotation: element.rotation,
  label: element.label,
  layer: element.layer,
  style: element.overrides,
});

/** The updates a save makes: only the fields that changed; the form's style is the element's own overrides. */
export const elementForm2DIntents = (element: Scene.Element2D, values: ElementForm2D): LayoutIntent[] => [
  ...FIELDS.flatMap((field): LayoutIntent[] =>
    JSON.stringify(values[field]) === JSON.stringify(element[field])
      ? []
      : [{ kind: 'update', id: element.id, path: [field], value: values[field] }],
  ),
  ...(JSON.stringify(values.style) === JSON.stringify(element.overrides)
    ? []
    : [{ kind: 'update' as const, id: element.id, path: ['overrides'], value: values.style }]),
];
