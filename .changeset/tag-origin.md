---
'@dxos/echo': minor
---

Tags now carry a first-class **origin** saying who owns them, and therefore who may change them. It is derived from the foreign key a tag already carries, so no schema change and no migration: `Tag.getOrigin(tag)` returns the origin domain (or `undefined` for a user-created tag), with `Tag.isUserTag` and `Tag.isProviderTag` as predicates, and `Tag.CANONICAL_ORIGIN` naming DXOS's own namespace for provider-agnostic tags such as `starred` and `sent`.

Three cases: a **user** tag (no key) is fully the user's; a **canonical DXOS** tag (`org.dxos.tag`) is applied and removed locally but its label and hue are fixed, since a provider may be mapping its own vocabulary onto it; a **foreign provider** tag (e.g. `com.google.gmail`) is read-only, because sync owns both the tag and which objects carry it.

Consequently, tag pickers — including the tags field on property and create forms — now offer **user tags only**. Previously they listed every tag in the space, so a Gmail label could be hand-applied to any object: on a synced object the next delta silently strips it, and on an unsynced one nothing ever corrects it. Pass an explicit `useResults` to a `RefField` to offer a specific origin domain.

`Tag.findOrCreate` also accepts `legacyKeys`, tried when the primary key misses and rewritten to the current key in place, so a provider can rename its key source without orphaning existing tags. Used by the two renames this ships: `com.google.gmail.label` → `com.google.gmail` and `org.ietf.jmap.mailbox` → `org.ietf.jmap` (the key sits on a `Tag`, so the object's type already said "label"). The foreign key on synced _messages_, `com.google.mail`, is deliberately unchanged.
