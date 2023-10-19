# Mosaic

Mosaic is a drag-and-drop layout system for building responsive, multi-column layouts. 
It is built on top of [dnd kit](https://dndkit.com/) and DXOS UI.


## Taxonomy

| Item               | Description                                                                                                          |
|:-------------------|:---------------------------------------------------------------------------------------------------------------------|
| Mosaic.Provider    | A Root container and React context that routes events between Containers.                                            |
| Mosaic.Overlay     | A DOM portal managed by the Mosaic context that renders a Container's Component while dragging.                      |
| Mosaic.Container   | A complex React component that manages the layout of a collection of tiles (e.g., Grid, Kanban, Stack, Table, Tree). |
| Mosaic.Tile        | A Draggable wrapper managed by its parent container.                                                                 |
| Component          | A pure React component that is rendered within the layout via the container's Tile or the root Mosaic's Overlay.     |
| Item               | A datum represented by a Tile.                                                                                       |


## Design principles

- Extends `dnd-kit` without obfuscation or wrapping;
  for example, mosaic provides additional hooks in the same manner as `dnd-kit`'s own useSortable`.
- Mosaics consist of containers and pure components that can be laid out and rearranged by the user
- DXOS UI components are pure tailwind-styled Radix components that expose small parts (List, ListItem, ListItem.Header, etc.)
- Mosaic Containers define their own data model and __assemble__ Radix-style DXOS UI components.
- Containers implement specific layouts of Tiles, which may reuse common components, such as DXOS UI Cards.
- Container Models facilitate pure React components, but are easily mapped to data structures (e.g., `Graph`)
  and `ECHO` data sets without the need to wrap/map the underlying __reactive__ objects (e.g., via `signals`).


## Issues

- When dragging across grid always set bounds (currently changes when between cell gaps).
- Remove padding between tiles in Sortable (causes flickering); instead selectively add padding to tiles.

- Projections/Lenses: tile props (e.g., label); position (e.g., index, grid position).
- Standardize generics (when to use any, unknown, provide default, etc.)
- Standardize events (e.g., onSelect).
- Standardize Mosaic Root components (e.g., make generic).
  - https://stackoverflow.com/questions/58469229/react-with-typescript-generics-while-using-react-forwardref#58473012
- Radix-style components and theming (forwardRefs).
- Focus (e.g., show grid while dragging in grid).
- Mobile

- Future of dnd-kit: https://github.com/clauderic/dnd-kit/issues/1194#issuecomment-1696704815
