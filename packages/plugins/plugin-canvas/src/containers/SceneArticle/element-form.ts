//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type LayoutIntent, Scene } from '@dxos/scene';

/** A vector as the form edits it: each axis may be cleared while typing, and a cleared axis takes the default's. */
const FormVec3 = Schema.Struct({
  x: Schema.optional(Schema.Number),
  y: Schema.optional(Schema.Number),
  z: Schema.optional(Schema.Number),
});
type FormVec3 = Schema.Schema.Type<typeof FormVec3>;

/** The fields a person edits in the 3D Properties form; bindings and parts are the tools' and the Library's. */
export const ElementForm = Schema.Struct({
  label: Scene.Element3D.fields.label,
  style: Scene.Element3D.fields.style,
  center: Schema.optional(FormVec3),
  rotation: Schema.optional(FormVec3),
  scale: Schema.optional(FormVec3),
});
export type ElementForm = Schema.Schema.Type<typeof ElementForm>;

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
  style: element.style,
  center: element.center ?? IDENTITY.center,
  rotation: element.rotation ?? IDENTITY.rotation,
  scale: element.scale ?? IDENTITY.scale,
});

/** The updates a save makes: only fields that changed, and a vector always whole, so the stored element stays valid. */
export const elementFormIntents = (element: Scene.Element3D, values: ElementForm): LayoutIntent[] => [
  ...(['label', 'style'] as const).flatMap((field): LayoutIntent[] =>
    JSON.stringify(values[field]) === JSON.stringify(element[field])
      ? []
      : [{ kind: 'update', id: element.id, path: [field], value: values[field] }],
  ),
  ...(['center', 'rotation', 'scale'] as const).flatMap((field): LayoutIntent[] => {
    const before = element[field] ?? IDENTITY[field];
    const after = complete(values[field], before);
    return JSON.stringify(after) === JSON.stringify(before)
      ? []
      : [{ kind: 'update', id: element.id, path: [field], value: after }];
  }),
];
