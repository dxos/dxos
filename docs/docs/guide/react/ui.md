---
order: 20
---

# UI Components

There are several packages of UI components available:

| Package                  | Description                                                                                                                                                                                                                                                      | Audience |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| `@dxos/react-components` | A set of **generic and pure** `primitives` (pure components) and `tokens` (colors, sizes) that form a UI system based on `radix`, `phosphor`, `react`, and `tailwind`. | Any react application. |
| `@dxos/react-ui`         | A set of **generic** components, pages, and layouts and specific user workflows for working with [ECHO](../platform) [spaces](../glossary#space), invitations, and join-flows. Depends on `@dxos/react-components`. | Any react application using ECHO and HALO. | 
| `@dxos/react-appkit`     | A set of **specific** components, pages, and layouts that are shared across DXOS-owned applications like the [HALO app](../platform/halo) itself. | Applications built and operated by DXOS. |

**Pure** components are those which keep their prop types as generic and detached from actual state management as possible.

**Generic** components are those which can be used by many applications and apply to many scenarios, and **specific** components are designed for one or two specific applications or use-cases.
