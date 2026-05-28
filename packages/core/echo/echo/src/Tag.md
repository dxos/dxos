# Tag

`Tag` is the ECHO type for labelling other objects. The schema is tiny — `{ label, hue? }` — but the *attachment pattern* varies by use case. This doc covers what's available and which pattern to use.

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

The canonical user-tagging path. Each tag lives as a standalone `Tag` object in the space; the *target* object holds an array of DXN refs to those tags inside its metadata bag. The form layer's [`ObjectProperties`](../../ui/react-ui-form/src/components/ObjectProperties) writes these via the `pinnedTags` control.

Use when: the target object is mutable. Tags can be added/removed cheaply by editing the metadata.

```ts
const tag = Obj.make(Tag.Tag, { label: 'important', hue: 'amber' });
db.add(tag);
Obj.update(target, (t) => { Obj.getMeta(t).tags = [tag.dxn]; });
```

### 2. Container-owned tag map — inverse index on the parent

For containers that hold immutable-in-feed objects (mailboxes hold messages, magazines hold posts), the children can't carry tag refs because they're immutable. Instead, the container holds an inverted `tagId → Ref<child>[]` map. Tag *definitions* live in the same map alongside the assignments.

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

| source | tag id | rationale |
| --- | --- | --- |
| provider-synced (e.g. Gmail labels) | external id (Gmail's `Label_123`) | preserves re-sync idempotence — same external id → same map entry, no duplicates |
| user-applied | random `ObjectId` | stable across renames; case-insensitive label dedupe via `findTagByLabel` at create time |

Trade-offs considered and rejected:
- Slug from label (`kebab-case(label)`) — natural dedupe but renaming a tag breaks references that point at the old key.
- ObjectId for everything — uniform but Gmail re-syncs would duplicate provider tags every run unless you also dedupe by label, which loses the external id.

### 3. `HasSubject` relation (deprecated)

The older pattern: a relation with `Source = Tag, Target = Object`. Lives at [`@dxos/types/HasSubject`](../../sdk/types/src/types/HasSubject.ts) and is marked `@deprecated`.

Use when: never, for new code. Existing data is being migrated to one of the two patterns above. The shape is functionally identical to (1), but doing it via a separate relation creates a query overhead (walk all relations for the object) that (1) avoids by inlining the refs.

## Hue conventions

Always store the Tailwind colour name (e.g. `'amber'`), not a hex. Surfaces translate via `data-hue` on the chip, which the design system maps to the right shade. See [`getHashStyles`](../../ui/react-ui-components) for the fallback hash when `hue` is unset.

## plugin-inbox: how the inbox uses Tag

Single source of truth: [`Mailbox.tags`](../../plugins/plugin-inbox/src/types/Mailbox.ts). Pattern 2 (container map). Replaces both the older `Mailbox.labels` (Gmail provider dictionary) and the `HasSubject`-relation user-tagging path with one record.

- Provider labels: `syncLabels` writes `mailbox.tags[gmailLabelId] = { label, source: 'provider', messages: [...] }`. Gmail's id is the map key so re-sync is idempotent.
- Per-message provider assignments: at sync time, after appending a message to the feed, the sync loop pushes `Ref.make(message)` onto each `mailbox.tags[labelId].messages` it was given.
- User tags / extractor tags: `Mailbox.applyTag(mailbox, { label, hue? }, message)` find-or-creates a `source: 'user'` entry and pushes a Ref. Idempotent.
- UI: `Mailbox.buildMessageTagsIndex(mailbox)` inverts the map to `messageId → Tag[]` for `MessageStack` tile chips; `Mailbox.getTagsForMessage(mailbox, message)` for the single-message case in `MessageHeader`.
- Extractor tagging: extractors that want to tag the source message return `{ tags: [{ label, hue? }] }` in their `ExtractResult`; the `ExtractMessage` dispatcher applies them after persistence. See the trip extractor for an example (`tags: [{ label: 'trip', hue: 'sky' }]`).

Adopting the same pattern in a new plugin: pick this shape when your plugin owns a mutable container with immutable feed-stored children, OR when you want a fast "tagged-with-X" inverted lookup. Copy `applyTag` / `removeTag` / `buildMessageTagsIndex` / `getTagsForMessage` (≈ 80 lines, no plugin-specific logic) and you have a working tag system on day one.
