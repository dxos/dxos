//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { LayerField, STYLE_FIELD_OVERRIDES, STYLE_FIELDS } from '@dxos/react-ui-canvas';
import { type FormFieldMap, type FormFieldOverride, NumberLayoutAnnotation, StepAnnotation } from '@dxos/react-ui-form';
import { type LayoutIntent, Scene, Style3D, styleFields } from '@dxos/scene';
import { VECTOR_AXIS_LAYOUT, VectorAnnotationId } from '@dxos/ui-types';

/** An axis as the form edits it: clearable while typing, and stepped by `step` with the stepper. */
const axis = (step: number) =>
  Schema.optional(Schema.Number.pipe(StepAnnotation.set(step), NumberLayoutAnnotation.set(VECTOR_AXIS_LAYOUT)));

/** A vector as the form edits it, one stacked number input per axis; a cleared axis takes the default's. */
const formVec3 = (step: number) =>
  Schema.Struct({ x: axis(step), y: axis(step), z: axis(step) }).annotate({ [VectorAnnotationId]: true });

/** A centre steps one unit of the ground grid's minor lines; a rotation 15 degrees; a scale a tenth. */
const FormVec3 = formVec3(1);
type FormVec3 = Schema.Schema.Type<typeof FormVec3>;

/** The fields a person edits in the 3D Properties form; bindings and parts are the tools' and the Library's. */
export const ElementForm = Schema.Struct({
  label: Scene.Element3D.fields.label,
  layer: Scene.Element3D.fields.layer,
  style: Schema.optional(Schema.Struct({ ...Style3D.fields, opacity: styleFields.opacity })),
  center: Schema.optional(formVec3(1)),
  rotation: Schema.optional(formVec3(15)),
  scale: Schema.optional(formVec3(0.1)),
});
export type ElementForm = Schema.Schema.Type<typeof ElementForm>;

/** The 2D canvas's style fields (its colour grid at `style.hue`, which sets the tone too) and its layer field. */
export const ELEMENT_FORM_FIELDS: FormFieldMap = { ...STYLE_FIELDS, layer: LayerField };

/** How those fields present, as in 2D. */
export const ELEMENT_FORM_OVERRIDES: Record<string, FormFieldOverride> = STYLE_FIELD_OVERRIDES;

type Vec3 = { x: number; y: number; z: number };

/** What an unset transform means: no offset, no turn, unit size. */
const IDENTITY: Readonly<Record<'center' | 'rotation' | 'scale', Vec3>> = {
  center: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
};

const complete = (value: FormVec3 | undefined, fallback: Vec3): Vec3 => ({
  x: value?.x ?? fallback.x,
  y: value?.y ?? fallback.y,
  z: value?.z ?? fallback.z,
});

/** The form's values for an element: an unset transform shows as the identity rather than as empty, required axes. */
export const elementFormValues = (element: Scene.Element3D): ElementForm => ({
  label: element.label,
  layer: element.layer,
  style: element.overrides,
  center: element.center ?? IDENTITY.center,
  rotation: element.rotation ?? IDENTITY.rotation,
  scale: element.scale ?? IDENTITY.scale,
});

/** The updates a save makes: only fields that changed, and a vector always whole, so the stored element stays valid. */
export const elementFormIntents = (element: Scene.Element3D, values: ElementForm): LayoutIntent[] => [
  ...(['label', 'layer'] as const).flatMap((field): LayoutIntent[] =>
    JSON.stringify(values[field]) === JSON.stringify(element[field])
      ? []
      : [{ kind: 'update', id: element.id, path: [field], value: values[field] }],
  ),
  // The form's style is the element's own overrides; its named style is the Library's.
  ...(JSON.stringify(values.style) === JSON.stringify(element.overrides)
    ? []
    : [{ kind: 'update' as const, id: element.id, path: ['overrides'], value: values.style }]),
  ...(['center', 'rotation', 'scale'] as const).flatMap((field): LayoutIntent[] => {
    const before = element[field] ?? IDENTITY[field];
    const after = complete(values[field], before);
    return JSON.stringify(after) === JSON.stringify(before)
      ? []
      : [{ kind: 'update', id: element.id, path: [field], value: after }];
  }),
];
