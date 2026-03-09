# Devtools ObjectsPanel Redesign

## Overview

Replace the current flat table-based ObjectsPanel with a tree view that shows object hierarchy (parent-child), relations, and provides a context menu for common operations.

**Current state:** `packages/devtools/devtools/src/panels/echo/ObjectsPanel/ObjectsPanel.tsx`
- Flat `DynamicTable` listing all objects with columns: id, type, version, deleted, schemaAvailable.
- Right side: `ObjectViewer` (JSON) + history table.

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ [DataSpaceSelector] [Filter...]                          │
├──────────────────────────┬───────────────────────────────┤
│                          │                               │
│  Tree View               │  JSON Viewer (ObjectViewer)   │
│                          │                               │
│  📦 Organization "DXOS"  │  {                            │
│    → WorksAt (Alice)     │    "id": "abc123",            │
│    → WorksAt (Bob)       │    "name": "DXOS",            │
│  📦 Organization "Acme"  │    ...                        │
│  👤 Person "Alice"       │  }                            │
│    → WorksAt (DXOS)      │                               │
│  👤 Person "Bob"         ├───────────────────────────────┤
│    📦 ChildTask "Fix..." │  Context Menu Actions:        │
│    → WorksAt (DXOS)      │  [Copy JSON] [Log] [Delete]  │
│  ⚡ Function "fn-0"      │                               │
│    📦 Trigger (timer)    │                               │
│  ──────────────────────  │                               │
│  ~~Deleted Object~~ (x)  │                               │
│                          │                               │
│  Objects: 42             │                               │
└──────────────────────────┴───────────────────────────────┘
```

## Tree View Structure

### Hierarchy Rules

1. **Root nodes:** All objects that have no parent (`Obj.getParent(obj) === undefined`) and are not relations.
2. **Child nodes:** Objects where `Obj.getParent(child) === parent` appear nested under their parent.
3. **Outgoing relations:** Relations where the object is the **source** appear under that source object (prefixed with arrow icon `→`).
4. **Incoming relations:** Relations where the object is the **target** appear under that target object (prefixed with arrow icon `←`).
5. **Note:** Relations appear in **two places** — once under source, once under target.

### Building the Tree

Given all items from `useQuery(space.db, Query.select(Filter.everything()).options({ deleted: 'include' }))`:

```typescript
// Partition items.
const objects: Obj.Any[] = [];     // Non-relation objects.
const relations: Obj.Any[] = [];   // Relations.

for (const item of items) {
  if (Relation.isRelation(item)) {
    relations.push(item);
  } else {
    objects.push(item);
  }
}

// Build parent → children map.
const childrenMap = new Map<string, Obj.Any[]>();  // parentId → children
const rootObjects: Obj.Any[] = [];

for (const obj of objects) {
  const parent = Obj.getParent(obj);
  if (parent) {
    const siblings = childrenMap.get(parent.id) ?? [];
    siblings.push(obj);
    childrenMap.set(parent.id, siblings);
  } else {
    rootObjects.push(obj);
  }
}

// Build object → relations maps.
const outgoingRelations = new Map<string, Obj.Any[]>(); // sourceId → relations
const incomingRelations = new Map<string, Obj.Any[]>(); // targetId → relations

for (const rel of relations) {
  const source = Relation.getSource(rel);
  const target = Relation.getTarget(rel);

  const outgoing = outgoingRelations.get(source.id) ?? [];
  outgoing.push(rel);
  outgoingRelations.set(source.id, outgoing);

  const incoming = incomingRelations.get(target.id) ?? [];
  incoming.push(rel);
  incomingRelations.set(target.id, incoming);
}
```

### Sorting

- Non-deleted objects first, deleted objects at the bottom.
- Within each group, sort alphabetically by `Obj.getLabel(obj)` or typename.

### Tree Node Rendering

Each tree node renders:

```
[icon] [label]
```

Where:
- **Icon:** Determined by schema `IconAnnotation` if present, otherwise default `ph--cube--regular`.
- **Label:** `Obj.getLabel(obj)` falling back to `Obj.getTypename(obj)` then `obj.id`.
- **Deleted objects:** Label has strikethrough styling and reduced opacity.
- **Relation nodes:**
  - Outgoing: `→ [RelationTypename] → [TargetLabel]`
  - Incoming: `← [RelationTypename] ← [SourceLabel]`
  - Icon: `ph--arrow-right--regular` for outgoing, `ph--arrow-left--regular` for incoming.

## Icons

| Entity Type | Icon | Source |
|---|---|---|
| Default object | `ph--cube--regular` | Fallback |
| Schema-annotated | From `IconAnnotation` | `getIconAnnotation(Obj.getSchema(obj))` |
| Outgoing relation | `ph--arrow-right--regular` | Hardcoded |
| Incoming relation | `ph--arrow-left--regular` | Hardcoded |

### Getting the Icon

```typescript
import { getIconAnnotation } from '@dxos/schema';

const getObjectIcon = (obj: Obj.Any): string => {
  const schema = Obj.getSchema(obj);
  if (schema) {
    const icon = getIconAnnotation(schema);
    if (icon) return icon;
  }
  return 'ph--cube--regular';
};
```

## Right-Hand Side: Object Detail + Context Menu

### JSON Viewer

Keep the existing `ObjectViewer` component. When a tree node is clicked:
- If it's a regular object or relation, show its JSON.
- Update on selection change.

### Context Menu Actions

Display as a toolbar/action bar below or above the JSON viewer:

| Action | Description | Implementation |
|---|---|---|
| **Copy JSON** | Copy serialized object to clipboard | `navigator.clipboard.writeText(JSON.stringify(obj, null, 2))` |
| **Print in Console** | Log object to browser console | `console.log(obj)` |
| **Delete** | Soft-delete the object | `space.db.remove(obj)` |
| **Undelete** | Restore a deleted object | *If API available, otherwise hide* |

Icons for actions:
- Copy JSON: `ph--copy--regular`
- Print in console: `ph--terminal--regular`
- Delete: `ph--trash--regular`
- Undelete: `ph--arrow-counter-clockwise--regular`

Show Delete for non-deleted objects, Undelete for deleted objects.

## Key APIs

| API | Import | Purpose |
|---|---|---|
| `Obj.getLabel(obj)` | `@dxos/echo` | Get display label for tree node |
| `Obj.getParent(obj)` | `@dxos/echo` | Determine parent-child hierarchy |
| `Obj.getTypename(obj)` | `@dxos/echo` | Fallback label / type display |
| `Obj.getSchema(obj)` | `@dxos/echo` | Get schema for icon annotation lookup |
| `Obj.isDeleted(obj)` | `@dxos/echo` | Strikethrough + sort deleted to bottom |
| `Obj.getDXN(obj)` | `@dxos/echo` | Get DXN for display in viewer |
| `Relation.isRelation(obj)` | `@dxos/echo` | Partition objects vs relations |
| `Relation.getSource(rel)` | `@dxos/echo` | Get source endpoint of relation |
| `Relation.getTarget(rel)` | `@dxos/echo` | Get target endpoint of relation |
| `getIconAnnotation(schema)` | `@dxos/schema` | Get icon from schema annotation |

## Implementation Steps

### Step 1: Tree Data Model

Create a `useObjectTree` hook that:
1. Takes `items: Obj.Any[]` from `useQuery`.
2. Partitions into objects and relations.
3. Builds parent→children and object→relations maps.
4. Returns a tree structure with sorted root nodes.

```typescript
type TreeNode = {
  id: string;
  obj: Obj.Any;
  icon: string;
  label: string;
  deleted: boolean;
  kind: 'object' | 'outgoing-relation' | 'incoming-relation';
  children: TreeNode[];
};
```

### Step 2: Tree View Component

Build a recursive `ObjectTree` component:
- Uses simple `<div>` nesting with indentation (or `@dxos/react-ui-list` Tree component if suitable).
- Each node is clickable → sets selected object.
- Expand/collapse toggles for nodes with children.
- Filter support: hide nodes that don't match filter text (but keep parent visible if a child matches).

### Step 3: Context Menu / Action Bar

Replace the history table with an action bar:
- Buttons: Copy JSON, Print in Console, Delete/Undelete.
- Show only when an object is selected.

### Step 4: Wire Up

- Left pane: Tree view (replaces `DynamicTable`).
- Right pane top: `ObjectViewer` (keep as-is).
- Right pane bottom: Action bar (replaces history `DynamicTable`).
- Keep the status bar with object count.

### Step 5: Polish

- Strikethrough styling for deleted objects with `line-through opacity-50`.
- Deleted objects sorted to bottom of each level.
- Search/filter applies across labels and typenames.
- Keyboard navigation support (arrow keys to move, Enter to select).

## File Changes

| File | Change |
|---|---|
| `ObjectsPanel.tsx` | Rewrite left pane from table to tree; add context actions |
| `ObjectsPanel.stories.tsx` | Already set up with diverse seeded data |
| *(optional)* `useObjectTree.ts` | Extract tree-building logic into a hook |
| *(optional)* `ObjectTree.tsx` | Extract tree view component |

## Open Questions

1. Should the history table be kept alongside the context menu, or replaced entirely?
2. Should relation nodes be expandable to show the relation's own properties in the tree, or only on click in the JSON viewer?
3. Should we support multi-select for bulk operations (delete multiple objects)?
