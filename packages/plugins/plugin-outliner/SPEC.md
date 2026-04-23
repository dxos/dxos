# plugin-outliner

Hierarchical tree-structured note-taking editor.

## Status

Labs (experimental).

## Description

An outliner editor for organizing ideas in nested bullet hierarchies. Supports collapsing, expanding, and reordering nodes with keyboard-first navigation.

## Features

- **Nested bullets**: Arbitrary depth tree structure.
- **Keyboard-first**: Tab/shift-tab to indent, enter to add, backspace to delete.
- **Collapse/expand**: Hide subtrees to focus on top-level structure.
- **Drag-and-drop**: Reorder nodes by dragging.
- **Journal mode**: Daily journal entries linked to outlines.
- **Translations**: Localizable UI strings.

## Schema

- `org.dxos.type.outline` — Outline document with nested node tree.
- `org.dxos.type.journal` — Journal container with daily entries.
- `org.dxos.type.journal-entry` — Individual dated journal entry.
