---
order: 20
---

# UI Components

There are several open-source packages of UI components available:

| Package                  | Description                                                                                                                                                                                                                                                      | Audience |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| `@dxos/react-components` | A set of pure components and tokens like colors and sizes that form a UI system based on `radix`, `phosphor`, `react`, and `tailwind`. | Any react application. |
| `@dxos/react-ui`         | A set of components, pages, layouts and specific user workflows for working with [ECHO](../platform) [spaces](../glossary#space), invitations, and join-flows. Depends on `@dxos/react-components`. | Any react application using ECHO and HALO. | 
| `@dxos/react-appkit`     | A set of components, pages, and layouts that are shared across DXOS-owned applications like the [HALO app](../platform/halo) itself. | Applications built and operated by DXOS. |

## Installation

### With Vite

```ts file=./snippets/vite-config.ts
```