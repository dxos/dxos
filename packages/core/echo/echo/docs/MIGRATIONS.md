# Migrations: upgrading stored data across plugin versions

Status: object and content migrations are implemented (the canvas is the first content user). The update warning, consent gating, retiring steps and `dx migrate` are not.

A plugin that changes the shape of data it stores declares the change as a **migration**: a pure
function from the old shape to the new one, keyed by a version. The client runs every contributed
migration once per space, writes the result back, and records the new version. Readers then accept
only the current version. Old migration steps are deleted on a schedule, and a user is warned before
an update rewrites data that collaborators on older versions can no longer edit.

ECHO already does this for objects. This document extends it to **content**: structured data a
plugin stores inside one field of an object, whose shape ECHO's schema does not describe.

For history, time travel and branches (also called versioning), see
[`echo-client/docs/VERSIONING.md`](../../echo-client/docs/VERSIONING.md). That is a different
feature.

## Object migrations (implemented)

An ECHO type's schema URI carries its version, so `org.dxos.type.sketch@0.1.0` and
`org.dxos.type.drawing@0.1.0` are different types to the database.

1. **Declare.** A plugin defines `Migration.define({ from, to, transform })` in `@dxos/echo`
   (`src/Migration.ts`). `transform` maps the old object's data to the new type's.
2. **Contribute.** The plugin contributes its migrations through the `ClientCapabilities.Migration`
   capability. plugin-illustrator's `sketchToDrawing` is one example and plugin-sandbox's
   `repositoryToRepo` is another.
3. **Run.** plugin-client subscribes to the contributed migrations and calls
   `db.runMigrations(migrations)` on every space (`plugin-client/src/capabilities/migrations.ts`).
   The database queries objects of the `from` type and replaces each one atomically with the
   transformed data under the `to` type (`echo-client/src/proxy-db/database.ts`).
4. **Re-run safely.** A migrated object no longer matches the `from` type, so a second pass, or a
   second peer, finds nothing to do.

`Migration.defineRename` handles a renamed type the same way: it repoints every reference.

## The gap: content inside an object

Some plugins store a whole format inside one field. A drawing's `Canvas.content` holds one JSON
record per node, link and view. Excalidraw, tldraw, markdown and sheet data have the same
structure. ECHO sees an opaque field, so the type's version cannot say which format the field holds.

Without a version, a format change can only be absorbed by a compatibility reader that upgrades data
as it is read. plugin-canvas has seven such readers today (`withLegacyNodeType`, `withLegacyParams`,
`withLegacyNode`, `withLegacyLine`, `withLegacyDirection`, `withLegacyTimeline` and the root-id
rename). They have three faults:

- **Nothing is written back.** A record is stored in the new shape only when someone edits it, so
  old records stay on disk for as long as nobody touches them.
- **They never end.** No record says what a drawing needs, so a reader can never be proven unused.
- **There is no order.** Each reader guesses what it might see, rather than applying one step after
  another.

## Content migrations

### The content version

A **content version** is a string stored on the object beside the content it describes, such as
`dxos.org/scene/1`. The string names the format and its revision.

The object type names the field that holds it with an annotation, so the runner can find it without
knowing the plugin:

```ts
export class Canvas extends Type.makeObject<Canvas>(DXN.make('org.dxos.type.canvas', '0.1.0'))(
  Schema.Struct({
    // The content version of `content` (and `styles`): `dxos.org/scene/1`, `tldraw.com/2`, ….
    schema: Schema.String.pipe(ContentVersionAnnotation.set({ fields: ['content', 'styles'] }), Schema.optional),
    content: Schema.Record(Schema.String, Schema.Any),
    styles: Schema.Record(Schema.String, Schema.Any).pipe(Schema.optional),
  }),
) {}
```

`Drawing.Canvas` already stores `schema`, which names the renderer dialect, so the canvas needs the
annotation and no new field. One type can hold several formats: each migration matches one version
string, so tldraw's steps never touch a scene canvas. The field is optional in the schema, but a canvas
with no `schema` is never migrated: its format cannot be known, and a step that guessed would rewrite another
format's records as its own. Every scene canvas has carried a `schema` since plugin-canvas was introduced.

### Declaring a step

A step migrates content from one version to the next:

```ts
export const sceneParams = Migration.defineContent({
  type: Drawing.Canvas,
  from: 'dxos.org/scene/1',
  to: 'dxos.org/scene/2',
  // The release that first ships this step, which decides when it can be deleted.
  since: '0.11.0',
  transform: (content) => mapNodes(content, withLegacyParams),
});
```

- `transform` is pure and deterministic. Two peers that migrate the same object at the same time
  must write identical values, so their Automerge changes merge to the same result.
- `transform` returns the whole new content. The runner writes only the records that changed, so a
  migration does not replace the field wholesale and collide with concurrent edits to other records.
- A step has exactly one `from` and one `to`. Upgrading from version 1 to version 3 applies the
  1→2 step and then the 2→3 step.

Content steps are contributed through the same `ClientCapabilities.Migration` capability as object
migrations, and `Migration.defineContent` lives in `@dxos/echo` next to `Migration.define`.

### Running

The runner is the existing `db.runMigrations` pass, extended:

1. For each content step, query objects of `type` whose content version equals `from`.
2. Apply the chain of steps from that version to the newest one the plugin declares.
3. Write the changed records and the new version string in one change.

An object whose version matches no step is left alone. A migrated object no longer matches any
step's `from`, so re-running the pass, on this peer or another, does nothing.

### Reading

A plugin's reader accepts its current version only. It handles the other cases explicitly:

| Content version found               | What the reader does                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| Current                             | Reads it.                                                                                         |
| Older, with a step chain to current | Upgrades it in memory through the same steps. This covers data that synced in after the pass ran. |
| Older than the oldest step          | Refuses it and shows "this drawing needs `dx migrate`".                                           |
| Newer than the plugin knows         | Shows it read-only with "update the Canvas plugin to edit this drawing".                          |

The last row matters for collaboration. Once one peer runs a new step, the stored version moves on,
and a collaborator on an older plugin sees a version it does not know. Read-only is the safe answer,
because writing a new-format record in the old shape would corrupt it.

## Breaking changes and warnings

A step that changes the stored version is a **breaking change** for anyone on an older plugin. Users
are told before it runs, not after.

- **The plugin declares it.** A plugin's metadata lists the content versions it writes. A release
  that raises one is breaking, and the changeset says so.
- **The update asks first.** When the plugin registry installs or updates a plugin whose new
  migrations would rewrite existing data, it shows what changes before activating: the affected
  type, the number of objects in this user's spaces, and that collaborators on older versions will
  see those objects read-only until they update. The user can continue or postpone the update.
- **Shared spaces get the warning too.** A space member who opens content at a version newer than
  their plugin sees the read-only banner from the reading table, with the plugin to update.
- **Steps run only after consent.** The runner skips a plugin's steps until the user has accepted
  its update, so installing a plugin never silently rewrites shared data.

## Retiring old steps

Steps are deleted, not kept forever.

1. Each step records `since`, the release that first shipped it.
2. The project declares a **minimum supported release**. Data written by an older release must be
   upgraded explicitly.
3. When the minimum supported release passes a step's `since`, the step and any in-memory fallback
   for its `from` version are deleted.
4. Data that still has a deleted version falls into the "older than the oldest step" row of the
   reading table. `dx migrate` runs the full historical chain from a release that still has it.

Raising the minimum supported release is itself a breaking change and is announced in the release
notes.

## First user: the canvas

plugin-canvas moves its seven readers into steps:

1. Annotate `Drawing.Canvas.schema` as the content version.
2. Fold today's readers into one step, `dxos.org/scene/1` → `dxos.org/scene/2`, since every
   existing drawing is version 1 and may need any of them.
3. Make the reader accept `dxos.org/scene/2` only, upgrading version 1 in memory through the step.
4. Delete the readers once the minimum supported release passes the step's `since`.

## Open questions

1. **Inline vs separate documents.** A content step that rewrites many records in a large canvas
   could be slow on first open. Should the runner batch steps per document, or run them lazily when
   an object is first loaded?
2. **Where consent lives.** Is consent to a plugin update stored per device or per space? Per space
   matches the effect, because the rewrite is shared, but it needs a space-level setting.
3. **Agents.** An agent's operation may write content directly. Should operations refuse to write an
   object whose content version is not current?
