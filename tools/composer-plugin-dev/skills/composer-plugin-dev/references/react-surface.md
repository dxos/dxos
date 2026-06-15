# React surface

Surfaces let other plugins render components for objects of your types. Contribute them via the `ReactSurface` capability.

```tsx
// src/capabilities/react-surface.tsx
import * as Effect from 'effect/Effect';
import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { FooArticle, FooCard } from '#containers';
import { Foo } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'thing',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Foo.Thing),
          AppSurface.object(AppSurface.Section, Foo.Thing),
        ),
        component: ({ data, role }) => (
          <FooArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'thing-card',
        filter: AppSurface.object(AppSurface.Card, Foo.Thing),
        component: ({ data, role }) => <FooCard role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
```

## Common roles

| Role                 | Usage                                 |
| -------------------- | ------------------------------------- |
| `article`            | Full-width object editor.             |
| `section`            | Smaller embedded form.                |
| `card--content`      | Card preview.                         |
| `object-properties`  | Sidebar property panel.               |
| `form-input`         | Custom form input for a schema field. |
| `dialog` / `popover` | Modal surfaces.                       |

## Filters

- `AppSurface.object(AppSurface.Article, Type)` — match an article surface for a specific ECHO type.
- `AppSurface.objectProperties(Type)` — match the property sidebar for a type.
- `AppSurface.oneOf(filter1, filter2)` — match any of several filters.

## Reference

- `packages/plugins/plugin-chess/src/capabilities/react-surface.tsx`
