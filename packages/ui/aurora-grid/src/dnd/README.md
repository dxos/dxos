# Mosaic

Mosaic is a drag-and-drop layout system for building responsive, multi-column layouts. 
It is built on top of [dnd kit](https://dndkit.com/) and Aurora.


## Taxonomy

| Item      | Description                                                                                                          |
|:----------|:---------------------------------------------------------------------------------------------------------------------|
| Mosaic    | Root container and context that routes events between Containers.                                                    |
| Overlay   | A DOM portal managed by the Mosaic context that renders a Container's Component while dragging.                      |
| Container | A complex React component that manages the layout of a collection of tiles (e.g., Grid, Kanban, Stack, Table, Tree). |
| Tile      | A Draggable wrapper managed by its parent container.                                                                 |
| Component | A pure React component that is rendered within the layout via the container's Tile or the root Mosaic's Overlay.     |
| Item      | A datum represented by a Tile.                                                                                       |


## Design principles

- Extends `dnd-kit` without obfuscation or wrapping;
  for example, mosaic provides additional hooks in the same manner as `dnd-kit`'s own useSortable`.
- Mosaics consist of containers and pure components that can be laid out and rearranged by the user
- Aurora components are pure tailwind-styled Radix components that expose small parts (List, ListItem, ListItem.Header, etc.)
- Mosaic Containers define their own data model and __assemble__ Radix-style Aurora components.
- Containers implement specific layouts of Tiles, which may reuse common components, such as Aurora Cards.
- Container Models facilitate pure React components, but are easily mapped to data structures (e.g., `Graph`)
  and `ECHO` data sets without the need to wrap/map the underlying __reactive__ objects (e.g., via `signals`).


## Issues

- isDroppable logic (subscriptions)? (e.g., prevent kanban column from accepting entire column.)
- Nested contexts (e.g., to set modifiers at different levels).
- Reactivity: tile props (e.g., label); position (e.g., index, grid position).
- Animation and flickering.

- Standardize generics (when to use any, unknown, provide default, etc.)
- Standardize events (e.g., onSelect).
- Standardize Mosaic Root components (e.g., make generic).
  - https://stackoverflow.com/questions/58469229/react-with-typescript-generics-while-using-react-forwardref#58473012
- Radix-style components and theming (forwardRefs).

- Focus (e.g., show grid while dragging in grid).
- Mobile
