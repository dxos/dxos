# Plugin Voxel - 3D Voxel Editor Design

## Overview

A DXOS plugin providing a collaborative 3D voxel editor. Users can create voxel worlds by placing colored blocks in a 3D grid, with Blender-style orbit controls.

## Approach

**3D Library: Three.js via React Three Fiber** - Already cataloged in the workspace (`@react-three/fiber@^9.5.0`, `@react-three/drei@^10.7.7`, `three@^0.178.0`). No new dependencies needed in the catalog.

## Data Type

ECHO schema `dxos.org/type/Voxel` (version 0.1.0) with:

- `name`: Optional string label.
- `voxels`: Record map keyed by `${x}:${y}:${z}` coordinates, values are `{ hue: string }` (ChromaticPalette hue name).
- `gridX`: Number (default 16) defining the grid extent along the x-axis.
- `gridY`: Number (default 16) defining the grid extent along the y-axis.
- `blockSize`: Number (default 1) defining the size of each voxel block.

Coordinate convention: x (right), y (forward), z (up/height). Grid is centered at the origin.

## Components

### VoxelEditor (component)

Pure 3D editor component (no ECHO dependency). Props:

- `voxels`: Array of voxel data.
- `gridX`, `gridY`: Grid dimensions.
- `blockSize`: Size of each voxel block.
- `toolMode`: Current tool (`select`, `add`, `remove`).
- `selectedHue`: Currently selected hue for new voxels.
- `readOnly`: Disables interaction for card view.
- `onAddVoxel(voxel)`: Callback when user left-clicks to add (in add mode).
- `onRemoveVoxel(position)`: Callback when user left-clicks to remove (in remove mode).

Uses:

- `@react-three/fiber` Canvas for rendering.
- `@react-three/drei` OrbitControls with Blender-style controls (Option-drag to orbit, Shift-drag to pan, scroll to zoom).
- Grid centered at origin with ground plane.
- Raycasting on click to determine voxel placement position.
- Ghost cursor preview showing where the next voxel will be placed.

### VoxelToolbar (component)

Standalone toolbar with tool mode toggle, color palette (ChromaticPalette hues), and clear button.

### VoxelArticle (container)

Connects ECHO `Voxel.World` data to VoxelEditor via `useObject`. Handles add/remove/clear mutations. Full article view with toolbar and hint overlay.

### VoxelCard (container)

Minimal read-only card view showing the voxel world with auto-framing camera.

## Plugin Structure

```
packages/plugins/plugin-voxel/
  .storybook/main.mts, preview.mts
  src/
    VoxelPlugin.tsx          - Plugin definition
    meta.ts                  - Plugin metadata
    translations.ts          - i18n
    index.ts                 - Exports
    types/
      Voxel.ts               - ECHO schema and helpers
      index.ts
    components/
      VoxelEditor/
        VoxelEditor.tsx       - Pure 3D component
        index.ts
      VoxelToolbar/
        VoxelToolbar.tsx      - Toolbar component
        VoxelToolbar.stories.tsx
        index.ts
    containers/
      VoxelArticle/
        VoxelArticle.tsx
        VoxelArticle.stories.tsx
        index.ts              - Default export bridge for React.lazy
      VoxelCard/
        VoxelCard.tsx
        VoxelCard.stories.tsx
        index.ts              - Default export bridge for React.lazy
      index.ts                - Lazy exports
    capabilities/
      react-surface/
        react-surface.tsx
        index.ts
      index.ts
```

## Registration

Add `VoxelPlugin` to `composer-app/src/plugin-defs.tsx` alongside other plugins. Not in core or defaults - user-enabled.

## Storybook

Stories for VoxelArticle, VoxelCard, and VoxelToolbar, following the chess pattern with `withTheme()`, `withLayout()` decorators.
