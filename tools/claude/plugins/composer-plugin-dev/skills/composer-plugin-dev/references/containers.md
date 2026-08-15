# Containers & UI primitives

Containers render surfaces. They **must** use standard `@dxos/react-ui` primitives — never custom Tailwind layout/styling. If you find yourself writing custom classNames for layout, you're missing a primitive.

## Primitives

| Primitive                                        | Use for                                             |
| ------------------------------------------------ | --------------------------------------------------- |
| `Panel.Root` / `Panel.Toolbar` / `Panel.Content` | Article / section structure                         |
| `ScrollArea.Root` + `ScrollArea.Viewport`        | Scrollable content (inside `Panel.Content asChild`) |
| `Input.Root` / `Input.Label` / `Input.TextInput` | Form fields                                         |
| `Button` (with `variant`)                        | Actions                                             |
| `Clipboard.IconButton`                           | Copy-to-clipboard                                   |
| `Toolbar.Root` / `Toolbar.IconButton`            | Toolbar actions                                     |
| `Card.Root` / `Card.Toolbar` / `Card.Content`    | Card surfaces                                       |
| `Icon`                                           | Phosphor icons                                      |
| `useTranslation(meta.id)`                        | i18n strings                                        |

The **only** acceptable classNames are functional layout hints on `ScrollArea.Viewport` (e.g. `p-4 space-y-4`) or responsive `@container` queries.

## Standard article container

```tsx
import { Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { meta } from '#meta';

export const FooArticle = ({ role, subject }: FooArticleProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>{/* toolbar */}</Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='p-4 space-y-4'>{/* Input.Root, Button, etc. */}</ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
```

## Suffix conventions

- `FooArticle` — `article` role.
- `FooSection` — `section` role.
- `FooCard` — `card--content` role.
- `FooDialog` / `FooPopover` / `FooSettings` — corresponding roles.

## Reactivity

All ECHO interfaces must be reactive. Use `useQuery`, `useObject`, atoms (`@effect-atom/atom-react`). Don't memoize ECHO objects across renders.

## Suspense

The `Surface` component wraps lazy containers in a top-level `<Suspense>`. Individual containers only need their own `<Suspense>` if they call `React.use()` or render lazy sub-components themselves.

## Reference

- `packages/plugins/plugin-chess/src/containers/ChessArticle/`
- `packages/plugins/plugin-discord/src/containers/BotArticle/`
