# Composer basics

The smallest journey through the app: a space, a few documents, and a deletion. Read
[README.md](README.md) for how a script is run, how an **Agent** line becomes a debug-port call, and
how to extend it.

Placeholders: `<runId>` is the run's id (any short unique string, e.g. the start time in base 36);
`<spaceId>`, `<doc1>` … are values captured from earlier steps' results; `<start>` is the run's
start timestamp in milliseconds, so every snapshot reports only this run's errors.

## Chapter 1: Spaces and documents

### Given

- The app has booted and the debug port answers.
- **Agent**: `snapshot { since: <start> }`
- **Expect**: `spaces` lists a `SPACE_READY` space flagged `default`, and no space whose name starts
  with `QA:`. A leftover belongs to an earlier run whose teardown did not finish; run that teardown
  (or delete it by hand) rather than proceeding, so this chapter never passes on someone else's
  artifacts. `errors` is empty.

  Without `snapshot` the debug plugin is not active on this profile: `invoke
org.dxos.operation.registry.enablePlugins { ids: ["org.dxos.plugin.debug"] }`, then retry.

### Steps

#### 1. Create a space

- **Do**: In the navtree, open the space list's **+**, name the space `QA: Basics <runId>` and create
  it. The navtree switches to the new space.
- **Agent**:
  1. `invoke org.dxos.operation.space.create { name: "QA: Basics <runId>" }` → capture `id` as
     `<spaceId>`.
  2. `invoke org.dxos.operation.appToolkit.switchWorkspace { subject: "root/<spaceId>" }` — the
     dialog does this for the human; the operation only creates.
- **Expect**: `snapshot` shows the space in `spaces` with that name and `SPACE_READY`, and
  `layout.workspace` is `root/<spaceId>`.

#### 2. Create three documents

- **Do**: With the new space selected, click **+** on the space and choose **Document** three times,
  naming them `QA: Doc 1`, `QA: Doc 2`, `QA: Doc 3`.
- **Agent**: three times, for `n` in 1..3:
  `invoke org.dxos.operation.markdown.create { name: "QA: Doc n", content: "# QA: Doc n\n\nCreated by the basics script, run <runId>.\n" } in <spaceId>`
  → capture each `id` as `<doc1>`, `<doc2>`, `<doc3>` (a URI, `echo://<spaceId>/<objectId>`).
- **Expect**: `invoke org.dxos.operation.space.queryObjects { typename: "org.dxos.type.document" } in <spaceId>`
  returns exactly the three labels; the navtree lists them under the space's collection.

#### 3. Open a document

- **Do**: Click `QA: Doc 2` in the navtree.
- **Agent**: `invoke org.dxos.operation.appToolkit.open { subject: ["root/<spaceId>/content/collections/<objectId of doc2>"] }`
- **Expect**: `snapshot` lists one plank with label `QA: Doc 2` and typename `org.dxos.type.document`,
  `layout.active` holds that path, and the editor shows the `QA: Doc 2` heading.

#### 4. Delete a document

- **Do**: Open the `⋮` menu on `QA: Doc 2` in the navtree and choose **Delete**.
- **Agent**: `invoke org.dxos.operation.space.removeObjects { objects: [object <doc2>] }` — the
  operation's output `wasActive` names the plank that was open.
- **Expect**: `snapshot` shows a toast titled **Document deleted** with actions **Close** and
  **Undo**, `layout.active` no longer holds the document's path, and `errors` is empty. This step
  is where a toast rendered outside a provider once threw `Tooltip.Trigger must be used within
Tooltip`.

#### 5. The rest survive

- **Do**: Reload the page and open the space again.
- **Agent**: `invoke org.dxos.operation.space.queryObjects { typename: "org.dxos.type.document" } in <spaceId>`
  (an agent cannot reload without losing the port, so it judges from the database.)
- **Expect**: Exactly `QA: Doc 1` and `QA: Doc 3` remain.

### Teardown

Removes only what this run created: the two remaining documents, then the space.

- **Do**: Delete `QA: Doc 1` and `QA: Doc 3` from their `⋮` menus, then open the space's settings
  and delete the space.
- **Agent**:
  1. `invoke org.dxos.operation.space.removeObjects { objects: [object <doc1>, object <doc3>] }`
  2. `invoke org.dxos.operation.space.delete { space: space <spaceId> }`
  3. `invoke org.dxos.operation.appToolkit.switchWorkspace { subject: "root/<default space id>" }` —
     the deleted space stays the workspace until another is chosen, and the app shows "You don't
     have this workspace" meanwhile.
- **Expect**: `snapshot` lists no space whose name starts with `QA:`, `layout.workspace` is the
  default space, and `errors` is empty.

## Chapter 2: Rename, undo and a second space

Independent of Chapter 1: its setup creates what it needs.

### Given

- **Agent**: `snapshot { since: <start> }`
- **Expect**: as Chapter 1 — a `SPACE_READY` default space, no `QA:` space, `errors` empty.

### Setup

- **Do**: Create a space `QA: Undo <runId>` (the navtree switches to it), then a document named
  `QA: Note` in it.
- **Agent**:
  1. `invoke org.dxos.operation.space.create { name: "QA: Undo <runId>" }` → capture `id` as `<spaceId>`.
  2. `invoke org.dxos.operation.appToolkit.switchWorkspace { subject: "root/<spaceId>" }`
  3. `invoke org.dxos.operation.markdown.create { name: "QA: Note", content: "# QA: Note\n\nRun <runId>.\n" } in <spaceId>`
     → capture `id` as `<note>`.

### Steps

#### 1. Rename the document

- **Do**: Open the `⋮` menu on `QA: Note` in the navtree, choose **Rename**, enter `QA: Note (renamed)`.
- **Agent**: `invoke org.dxos.operation.space.updateObject { object: ref <note>, properties: { name: "QA: Note (renamed)" } } in <spaceId>`
  — the menu's own operation only opens the rename dialog; the update is what the dialog commits.
- **Expect**: `invoke org.dxos.operation.space.queryObjects { typename: "org.dxos.type.document" } in <spaceId>`
  returns the one document labelled `QA: Note (renamed)`, and the navtree row reads the same.

#### 2. Open, delete, undo

- **Do**: Click the document to open it. Delete it from its `⋮` menu. Click **Undo** in the
  **Document deleted** toast.
- **Agent**:
  1. `invoke org.dxos.operation.appToolkit.open { subject: ["root/<spaceId>/content/collections/<objectId of note>"] }`
  2. `invoke org.dxos.operation.space.removeObjects { objects: [object <note>] }`
  3. `invoke org.dxos.operation.debug.revertLast {}` — the toast's Undo, as an operation.
- **Expect**: After 2, `snapshot` shows the **Document deleted** toast and no active plank. After 3,
  `queryObjects` lists the document again, `layout.active` holds its path once more (the restore
  reopens what was open), and `errors` is empty. Clicking **Undo** also dismisses the toast; the
  operation bypasses the toast, so for the agent it stays until it times out.

#### 3. A second space

- **Do**: Create a space `QA: Undo B <runId>`; the navtree switches to it and shows no documents.
  Switch back to `QA: Undo <runId>` from the space list.
- **Agent**:
  1. `invoke org.dxos.operation.space.create { name: "QA: Undo B <runId>" }` → capture `id` as `<spaceB>`.
  2. `invoke org.dxos.operation.appToolkit.switchWorkspace { subject: "root/<spaceB>" }`
  3. `invoke org.dxos.operation.space.queryObjects { typename: "org.dxos.type.document" } in <spaceB>`
  4. `invoke org.dxos.operation.appToolkit.switchWorkspace { subject: "root/<spaceId>" }`
- **Expect**: After 2, `snapshot.layout.workspace` is `root/<spaceB>` and `spaces` lists both `QA:`
  spaces `SPACE_READY`. Step 3 returns no documents. After 4, the workspace is `root/<spaceId>`
  again and its document is still listed.

### Teardown

- **Do**: Delete the document, then both spaces from their settings; pick the default space.
- **Agent**:
  1. `invoke org.dxos.operation.space.removeObjects { objects: [object <note>] }`
  2. `invoke org.dxos.operation.space.delete { space: space <spaceId> }`
  3. `invoke org.dxos.operation.space.delete { space: space <spaceB> }`
  4. `invoke org.dxos.operation.appToolkit.switchWorkspace { subject: "root/<default space id>" }`
- **Expect**: `snapshot` lists no `QA:` space, the workspace is the default space, `errors` is empty.
