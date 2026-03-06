# Plugin Voxel - 3D Voxel Editor Design

## Overview

A DXOS plugin providing a collaborative 3D voxel editor. Users can create voxel worlds by placing colored blocks in a 3D grid, rotating and zooming the view with orbit controls.

## Approach

**3D Library: Three.js via React Three Fiber** - Already cataloged in the workspace (`@react-three/fiber@^9.5.0`, `@react-three/drei@^10.7.7`, `three@^0.178.0`). No new dependencies needed in the catalog.

## Data Type

ECHO schema `dxos.org/type/Voxel` with:
- `name`: Optional string label.
- `voxels`: Array of `{ x: number, y: number, z: number, color: number }` representing placed blocks.
- `gridSize`: Number (default 16) defining the world bounds.

The `voxels` array stores integer coordinates. Color is stored as a hex number.

## Components

### VoxelEditor (component)
Pure 3D editor component (no ECHO dependency). Props:
- `voxels`: Array of voxel data.
- `gridSize`: Grid dimensions.
- `onAddVoxel(position, color)`: Callback when user clicks to add.
- `onRemoveVoxel(position)`: Callback for right-click removal.

Uses:
- `@react-three/fiber` Canvas for rendering.
- `@react-three/drei` OrbitControls for camera rotation/zoom.
- Grid plane helper for orientation.
- Raycasting on click to determine voxel placement position.
- Color palette toolbar for selecting block color.

### VoxelArticle (container)
Connects ECHO `Voxel` data to VoxelEditor. Handles add/remove mutations. Full article view with toolbar.

### VoxelCard (container)
Minimal read-only card view showing the voxel world.

## Plugin Structure

Mirrors `plugin-chess` exactly:
```
packages/plugins/plugin-voxel/
  .storybook/main.mts, preview.mts
  src/
    VoxelPlugin.tsx          - Plugin definition
    meta.ts                  - Plugin metadata
    translations.ts          - i18n
    index.ts                 - Exports
    types/
      Voxel.ts               - ECHO schema
      index.ts
    components/
      VoxelEditor/
        VoxelEditor.tsx       - Pure 3D component
        index.ts
    containers/
      VoxelArticle/
        VoxelArticle.tsx
        VoxelArticle.stories.tsx
        index.ts
      VoxelCard/
        VoxelCard.tsx
        VoxelCard.stories.tsx
        index.ts
      index.ts
    capabilities/
      react-surface/
        react-surface.tsx
        index.ts
      index.ts
```

## Registration

Add `VoxelPlugin` to `composer-app/src/plugin-defs.tsx` alongside other plugins. Not in core or defaults - user-enabled.

## Storybook

Stories for VoxelArticle and VoxelCard, following the chess pattern with `withTheme()`, `withLayout()` decorators.
