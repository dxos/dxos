# ECHO types & schemas

Types are Effect Schema definitions registered with ECHO via `Type.object()`.

```ts
// src/types/Foo.ts
import * as Schema from 'effect/Schema';
import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

export const Thing = Schema.Struct({
  name: Schema.optional(Schema.String),
  notes: Schema.optional(Schema.String).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'com.example.type.thing',   // dotted, namespaced — globally unique.
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--cube--regular',
    hue: 'indigo',
  }),
);

export interface Thing extends Schema.Schema.Type<typeof Thing> {}

export const make = ({ name, notes }: { name?: string; notes?: string } = {}) =>
  Obj.make(Thing, { name, notes });
```

## Conventions

- **Typename** is a globally unique dotted identifier (`com.example.type.thing`). Use your domain.
- **Version** uses semver; bump on schema changes.
- Always add `LabelAnnotation` so the UI knows what to display as the title.
- Always add `IconAnnotation` (Phosphor icon + hue) for visual identity.
- Provide a `make()` factory using `Obj.make()` — never `new` an ECHO object.
- Use `FormInputAnnotation.set(false)` to hide a field from auto-generated forms.

## Namespace re-export

```ts
// src/types/index.ts
export * as Foo from './Foo';
```

Other code imports as `import { Foo } from '#types'` then uses `Foo.Thing`, `Foo.make()`. This keeps namespaces clean as more types are added.

## Refs

For relationships between objects, use `Ref.Ref(OtherType)`:

```ts
import { Ref } from '@dxos/echo';

owner: Ref.Ref(Person).annotations({ description: 'Owner of the thing' }),
```

## Registration

Register your types via `AppPlugin.addSchemaModule({ schema: [Foo.Thing] })` in your plugin definition.

## Reference

- `packages/plugins/plugin-chess/src/types/Chess.ts`
