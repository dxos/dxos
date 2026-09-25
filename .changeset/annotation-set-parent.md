---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

New `Annotation.SetParent` marks a `Ref` field (or an array-of-`Ref` field) as owning its targets: writing a ref into the field, or creating the holder with one, now sets the target's ECHO parent automatically, so the child cascade-deletes and deep-clones with its holder. Nested struct fields and members of a discriminated union field are covered too.

Types across the repo now declare ownership on the field instead of calling `Obj.setParent` next to every write — `Instructions.text`, `Outline.content`, `Project.{instructions,outline,taskSet,routines}`, `Chat.feed`, `Agent.instructions`, `File.data`, `Channel.backend.config`, `Document.content`, `Mailbox`/`Calendar`/`Search`/`Subscription` feeds and tag indexes, `Routine.{spec.instructions,triggers}`, `Scene.objects`, `Terra.objects`, and `Artifact.variants`. Removing a ref still does not clear the target's parent; call `Obj.setParent(child, undefined)` for that.
