# Voxel Plugin

- This file represents the specification and plan for the Voxel plugin.
- Update this document to record progress, issues, and any implementation notes.

## Spec

### Phase 1

- [x] Select current color in toolbar
- [x] Wheel to zoom
- [x] Show "ghost" voxel at cursor
- [x] Select current tool in toolbar: Select, Add, Remove
- [x] Click to add/remove depending on tool mode
- [x] Show hints in floating panel at bottom of editor (not in toolbar)
- [x] CMD-drag (and middle button) to move/rotate world (not right-click)
- [x] Base grid should be 50% transparent
- [x] BUG: Currently main axis isn't visible; should be in different color
- [x] Hide any voxels that are outside of the current grid size
- [x] Grid should have separate x/y dimension
- [x] Use `ChromaticPalette` `styles` from hash-styles for palette (replace hard coded values)
- [x] Factor out toolbar into separate component with story
- [x] Add "Clear" button in toolbar
- [x] Remove ground plane and orbit controls from card view
- [ ] Configure block size

### Phase 2 (Editor Enhancements)

- [ ] Implement agent blueprint for creating/deleting blocks (e.g., "create tower five blocks high")
- [ ] Paint tool to change color of existing voxels
- [ ] Fill/Flood tool to fill a rectangular region or connected empty space
- [ ] Copy/Paste/Mirror selection across an axis

### Phase 3 (Advanced Features)

- [ ] Undo/Redo with Cmd+Z / Cmd+Shift+Z (generalize with ECHO)
- [ ] Physics simulation (e.g., gravity, collision, block toppling)
- [ ] Game mode (e.g., missiles/projectiles to knock down structures)
- [ ] Export to glTF/OBJ for downloading voxel models as standard 3D formats
- [ ] Import image
- [ ] Layer visibility toggle for editing interior structures by Y-axis
- [ ] Collaborative cursors showing other users' ghost cursors and tool selections via ECHO

## Implementation Notes
