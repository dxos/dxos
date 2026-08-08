# Tag

`Tag` is the ECHO type for labelling other objects. The schema is tiny — `{ label, hue? }` — but the _attachment pattern_ varies by use case. This doc covers what's available and which pattern to use.

## What `Tag` is

Definition: [`Tag.ts`](./src/Tag.ts) — `Schema.Struct({ label: String, hue?: String })` with DXN `org.dxos.type.tag@0.1.0`. Carries the `SystemTypeAnnotation` so it's treated as a built-in type by the ECHO runtime.

Helpers on the same module:

- `Tag.make(props)` — constructor.
- `Tag.Map` — `Record<string, Tag>` alias used by call-site indexes.
- `Tag.createTagList(tags)` — `Map → Tag[]`, sorted by label.
- `Tag.findTagByLabel(tags, name)` — case-insensitive label lookup.
- `Tag.sortTags(a, b)` — `localeCompare` on label.

### Colour (`hue`)

`hue` is a Tailwind colour name (`red`, `orange`, `amber`, …). The canonical list lives in [`IconAnnotation`'s schema](./src/internal/Annotation/annotations.ts) (search `IconAnnotationSchema`). Surfaces that render chips read `hue` to colour the chip; rendering hashes the tag id as a fallback when `hue` is absent.

## Attachment patterns

Three ways an object can carry tags. Pick the one that matches your storage shape:

### 1. `Obj.getMeta(obj).tags` — DXN refs on the object's metadata

The canonical user-tagging path. Each tag lives as a standalone `Tag` object in the space; the _target_ object holds an array of DXN refs to those tags inside its metadata bag. The form layer's [`ObjectProperties`](../../ui/react-ui-form/src/components/ObjectProperties) writes these via the `pinnedTags` control.

Use when: the target object is mutable. Tags can be added/removed cheaply by editing the metadata.

```ts
const tag = Obj.make(Tag.Tag, { label: 'important', hue: 'amber' });
db.add(tag);
Obj.update(target, (t) => {
  Obj.getMeta(t).tags = [tag.dxn];
});
```

### 2. Container-owned tag map — inverse index on the parent

For containers that hold immutable-in-feed objects (mailboxes hold messages, magazines hold posts), the children can't carry tag refs because they're immutable. Instead, the container holds an inverted `tagId → Ref<child>[]` map. Tag _definitions_ live in the same map alongside the assignments.

Use when: the children are append-only feed records, OR you need a fast "all objects tagged X" query without scanning each child.

Reference shape (from plugin-inbox's [`Mailbox.tags`](../../plugins/plugin-inbox/src/types/Mailbox.ts)):

```ts
Mailbox.tags: Record<TagId, {
  label: string,
  hue?: string,
  source?: 'provider' | 'user',
  messages: Ref<Message>[],
}>
```

Tag-id strategy depends on origin:

| source                              | tag id                            | rationale                                                                                |
| ----------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------- |
| provider-synced (e.g. Gmail labels) | external id (Gmail's `Label_123`) | preserves re-sync idempotence — same external id → same map entry, no duplicates         |
| user-applied                        | random `EntityId`                 | stable across renames; case-insensitive label dedupe via `findTagByLabel` at create time |

Trade-offs considered and rejected:

- Slug from label (`kebab-case(label)`) — natural dedupe but renaming a tag breaks references that point at the old key.
- EntityId for everything — uniform but Gmail re-syncs would duplicate provider tags every run unless you also dedupe by label, which loses the external id.

### 3. `HasSubject` relation (deprecated)

The older pattern: a relation with `Source = Tag, Target = Object`. Lives at [`@dxos/types/HasSubject`](../../sdk/types/src/types/HasSubject.ts) and is marked `@deprecated`.

Use when: never, for new code. Existing data is being migrated to one of the two patterns above. The shape is functionally identical to (1), but doing it via a separate relation creates a query overhead (walk all relations for the object) that (1) avoids by inlining the refs.

## Hue conventions

Always store the Tailwind colour name (e.g. `'amber'`), not a hex. Surfaces translate via `data-hue` on the chip, which the design system maps to the right shade. See [`getHashStyles`](../../ui/react-ui-components) for the fallback hash when `hue` is unset.

## Tag origin (design — decided 2026-08-08, not yet implemented)

A tag's **origin** says who owns it, and therefore who may change it. Three cases, all derivable
from data that already exists — `Obj.getMeta(tag).keys[].source`:

| Origin               | Foreign key                               | Owner                | Mutable?                                              |
| -------------------- | ----------------------------------------- | -------------------- | ----------------------------------------------------- |
| **User**             | none                                      | the user             | fully — rename, recolour, apply, remove               |
| **Canonical DXOS**   | `org.dxos.tag`                            | DXOS                 | apply/remove locally; label + hue are fixed           |
| **Foreign provider** | any other domain, e.g. `com.google.gmail` | the syncing provider | read-only — sync owns both the tag and its membership |

`findOrCreate` already splits keyed from unkeyed on exactly this basis (a keyed tag matches by key, an
unkeyed one matches by label among unkeyed tags only, "so it never collides with a keyed
system/provider tag of the same label"). The origin concept just names what the key already encodes.

**`@dxos/echo` never learns which providers exist.** To classify a tag three ways it only needs to
recognise its _own_ namespace (`org.dxos.tag`); everything else is foreign by definition. So a
third-party provider needs no change here to get correct read-only behaviour.

### Rules

1. **Foreign-provider tags are immutable in Composer** — no rename, no recolour, and they cannot be
   attached to or detached from an object through the UI. Their membership is sync's to decide. This
   is already true in practice: nothing outside the sync providers writes a `com.google.*` or
   `org.ietf.jmap.*` tag today. The rule stops it becoming untrue — in particular it blocks
   hand-applying a Gmail tag to a non-message object, where sync never looks and the false
   attribution would persist forever (on a _message_ the next label delta silently strips it, which
   is confusing in a different way).
2. **Canonical DXOS tags stay locally toggleable.** `starred`, `draft` and `sent` are applied and
   removed by ordinary UI today (the star button in four containers, the draft lifecycle, the send
   flow) and must keep working. `SystemTags.ts` exists precisely so a Gmail star, a JMAP `$flagged`
   keyword and a local star resolve to the _same_ `Tag` object; treating "has a foreign key" as
   "immutable" would break that.
3. **Pickers default to user tags.** The `_tags` field spliced onto property/create forms
   (`withMetaTags`) resolves candidates through `RefField`'s `defaultUseResults`, i.e. every `Tag` in
   the space. It must instead offer user-origin tags only, with non-user domains shown on explicit
   opt-in. `ViewEditor` and `QueryForm` query all tags the same way and inherit the same fix.

### Origin domain vs. key source

The **domain** is the provider namespace and is coarser than the key source, which also names the
resource kind within it:

| Key source               | Domain             | Resource         |
| ------------------------ | ------------------ | ---------------- |
| `com.google.gmail.label` | `com.google.gmail` | label            |
| `org.ietf.jmap.mailbox`  | `org.ietf.jmap`    | mailbox (folder) |
| `org.dxos.tag`           | `org.dxos`         | tag              |

Only the domain is user-facing, so a picker groups Gmail labels and (later) Gmail categories under
one "Gmail" heading. **Open:** whether the domain is declared alongside each source or derived by
trimming the last segment, and how it reconciles with the existing sources that do _not_ follow the
pattern — messages are keyed `com.google.mail` (not `com.google.gmail`) and integrations
`com.google`. Renaming any persisted source is a migration, not an edit: change the constant and
every existing tag orphans, so sync re-creates duplicates. Prefer declaring the domain next to the
source over renaming sources to fit a rule.

### Rollout

Two steps, so the filtering behaviour can land before the provider plugins exist:

1. **No registry** — `Tag.getOrigin(tag)` returns the raw source and pickers group by it verbatim.
   Zero new machinery; user-visible reverse-DNS strings are the cost.
2. **Then a capability** — each provider plugin contributes `{ domain, label, icon? }`
   (`plugin-google` → "Gmail"), resolved by the container rendering the form and threaded down, since
   `react-ui-form` components must not call capability hooks. Same shape as
   `InboxCapabilities.MailSendOperation`, and the entries move with the provider plugins at no extra
   cost. Upgrading from step 1 changes no stored data.

## plugin-inbox: how the inbox uses Tag

> **STALE — describes a shape that no longer exists.** `Mailbox.tags` is now
> `Ref<TagIndex.TagIndex>`; tag definitions are standalone `Tag` objects carrying foreign keys, and
> assignment goes through `@dxos/schema`'s `Tagging` / `TagIndex`. Note what was lost in that
> migration: the record below had an explicit `source: 'provider' | 'user'` discriminator, which
> became an implicit foreign-key convention with no accessor and no enforcement — the gap the origin
> design above closes. Rewrite this section against `TagIndex` when touching it.

Single source of truth: [`Mailbox.tags`](../../plugins/plugin-inbox/src/types/Mailbox.ts). Pattern 2 (container map). Replaces both the older `Mailbox.labels` (Gmail provider dictionary) and the `HasSubject`-relation user-tagging path with one record.

- Provider labels: `syncLabels` writes `mailbox.tags[gmailLabelId] = { label, source: 'provider', messages: [...] }`. Gmail's id is the map key so re-sync is idempotent.
- Per-message provider assignments: at sync time, after appending a message to the feed, the sync loop pushes `Ref.make(message)` onto each `mailbox.tags[labelId].messages` it was given.
- User tags / extractor tags: `Mailbox.applyTag(mailbox, { label, hue? }, message)` find-or-creates a `source: 'user'` entry and pushes a Ref. Idempotent.
- UI: `Mailbox.buildMessageTagsIndex(mailbox)` inverts the map to `messageId → Tag[]` for `MessageStack` tile chips; `Mailbox.getTagsForMessage(mailbox, message)` for the single-message case in `MessageHeader`.
- Extractor tagging: extractors that want to tag the source message return `{ tags: [{ label, hue? }] }` in their `ExtractResult`; the `ExtractMessage` dispatcher applies them after persistence. See the trip extractor for an example (`tags: [{ label: 'trip', hue: 'sky' }]`).

Adopting the same pattern in a new plugin: pick this shape when your plugin owns a mutable container with immutable feed-stored children, OR when you want a fast "tagged-with-X" inverted lookup. Copy `applyTag` / `removeTag` / `buildMessageTagsIndex` / `getTagsForMessage` (≈ 80 lines, no plugin-specific logic) and you have a working tag system on day one.
