# Feature map editing

Status: proposal, 2026-10-19. Follows dxos/dxos#14031, which shipped feature maps read-only in the UI:
agents could change a map over MCP, but a person could only drag boxes on the canvas.

## Goal

A person can build and maintain a feature map in Composer without an agent: add features, set their
status, connect and disconnect dependencies, take features off the map, and link work and evidence.
Every edit goes through the same `FeatureOperation` verbs agents use, so the UI and MCP cannot drift
and both get the same rules (a dependency that closes a cycle is refused and named).

## Edits by place

| Where             | Edit                                          | Gesture                                                                                                | Operation                              |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Map toolbar       | Create a feature                              | `+` puts an unnamed card on the map with its name field open                                           | `CreateFeature { name, map }`          |
| Map toolbar       | Add an existing feature                       | A picker of the space's features not on the map; its Create row adds one by the typed name             | `AddToMap`, `CreateFeature`            |
| Card (cards view) | Rename, describe                              | Double-click the name or description, or its pencil; Enter or leaving saves, Escape keeps the old text | `UpdateFeature { name / description }` |
| Canvas box        | Rename, describe                              | The field's pencil, since a double-click on a box opens the feature                                    | `UpdateFeature { name / description }` |
| Card menu (cards) | Set status                                    | Radio group of the five statuses                                                                       | `UpdateFeature { status }`             |
| Card menu         | Open                                          | Opens the feature article beside the map                                                               | `LayoutOperation.Open`                 |
| Card menu         | Remove from map                               | Keeps the feature                                                                                      | `RemoveFromMap`                        |
| Canvas            | Add a dependency                              | Drag from a box's port to another box                                                                  | `AddDependency`                        |
| Canvas            | Remove a dependency                           | Select the arrow, press Delete                                                                         | `RemoveDependency`                     |
| Canvas            | Remove from map                               | Select a box, press Delete                                                                             | `RemoveFromMap`                        |
| Canvas            | Open a feature                                | Double-click a box                                                                                     | `LayoutOperation.Open`                 |
| Feature article   | Add a dependency                              | Picker under "Depends on"                                                                              | `AddDependency`                        |
| Feature article   | Remove a dependency                           | Remove action on the row                                                                               | `RemoveDependency`                     |
| Feature article   | Link a task                                   | Picker under "Tasks"                                                                                   | `LinkTask`                             |
| Feature article   | Name, description, status, specs, subfeatures | Form (already editable)                                                                                | direct                                 |

## Decisions

1. **Operations, not direct writes, for anything with a rule.** Dependencies are cycle-checked,
   linking and map membership are idempotent, and showcase creation is atomic. The UI invokes the
   operation through the operation invoker; a refused edit surfaces its error message as a toast, so a
   person sees "Accounts → Sync → Tokens → Accounts would close a cycle" exactly as an agent does.
   Plain field edits in the feature form stay direct writes, as they are today.
2. **The canvas edits the model, not its picture.** The dynamic projection currently answers `link`
   and `delete` intents by mutating its own graph atom. A host gets an `onLink` / `onDelete` hook
   instead; when set, the projection calls it and leaves the graph alone, and the graph changes when
   ECHO does. A refused link therefore never appears, and two peers editing see the same graph.
3. **Delete on the map never deletes a feature.** A feature can be on several maps and owns its
   tasks' links and showcases' targets, so the map's delete is "remove from map". Deleting the object
   itself stays where every object is deleted: its own menu in the navigator.
4. **Create and edit on the map.** The toolbar's `+` creates a `planned` feature on the map and opens
   its name field on the new card, so a map is built without leaving it. Name and description are
   edited in place on cards and canvas boxes; status, specs and subfeatures stay in the card menu and
   the article. Keys typed in a field stop at the field, so Backspace never deletes the selected box.
5. **Status from the card.** Status is the edit made most often and the one the map is read for, so
   the card menu lists the five statuses inline, one click away, rather than in a submenu or the article.
6. **The graph is derived through atoms.** Query results keep their identity when a member's field
   changes, so the card models are computed in an atom that reads each feature, task and showcase with
   `Obj.atom`; a status set here, by an agent or by a peer re-renders the cards. Neighbours of an open
   feature are loaded by relation traversal, so a dependency added while it is open appears at once.

## Out of scope

- Reordering cards by drag (map order is still the order features were added).
- Creating showcases from the UI beyond the existing create entry; agents make them.
- Editing a dependency's direction in place (remove and redraw it).

## Tests

- Story play tests for each gesture: toolbar add, card status change, remove from map, canvas link
  and delete, article add/remove dependency and link task, and a refused cycle showing its message.
- `react-ui-canvas` unit tests for the `onLink` / `onDelete` hooks: the hook is called and the
  graph atom is not mutated.
