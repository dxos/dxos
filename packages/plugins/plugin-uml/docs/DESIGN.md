# plugin-uml — design

## Why

The UML skill and the canvas class shape lived in two other packages: the skill in plugin-illustrator, which is
renderer-neutral and owns no domain, and the class shape in the canvas engine (`react-ui-canvas`), which should
carry only generic shapes. Both belong to one domain, so they move to a plugin of their own.

## What it contributes

| Contribution                        | To                                            | Activates on                       |
| ----------------------------------- | --------------------------------------------- | ---------------------------------- |
| `UmlSkill` (moved from illustrator) | `AppCapabilities.SkillDefinition`             | the assistant's start              |
| The `class` node type               | `CanvasCapabilities.NodeType` (plugin-canvas) | `IllustratorEvents.Start`, browser |

The class type is a `NodeDefSpec` (`src/types/ClassNode.ts`): its schema, a `create` with placeholder members,
its text parts (`name`, then `attributes` and `methods` one per line), and the properties panel's `LinesField`
for the two lists. The view (`ClassNodeView`) is added by the capability so the type module stays free of React.

## Decisions

1. **Disabled means no UML.** With the plugin off, the assistant has no UML skill and an existing class shape
   draws as an unknown-type box; its record is kept, so turning the plugin back on restores it.
2. **plugin-canvas is optional at runtime.** The skill works in any renderer; the class shape is only consumed
   when plugin-canvas is enabled (a contribution nobody collects costs nothing).
3. **Inheritance is an engine marker.** The hollow-triangle end (`ends: { end: 'triangle' }`) is a generic link
   marker in react-ui-canvas, usable by any type; UML is its first user.

## Engine changes it relies on (react-ui-canvas)

- Node types declare their text parts (`NodeDef.parts`) and form renderers (`NodeDef.fields`); in-place editing,
  shape cloning and diagram export read them instead of switching on built-in types.
- `class` left the built-in types; `SceneBuilder.build(registry)` starts a host type from its own `create`.
