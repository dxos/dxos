---
'@dxos/echo': minor
---

Tasks, task sets and milestones are now modelled with uni-directional refs. A `TaskSet` carries an ordered `tasks` array holding **every** task in the set — sub-tasks included, so listing a set is one read rather than a tree walk — plus an ordered `milestones` array. A task states its own place with two many-to-one refs: `parentTask` for the sub-task hierarchy and `milestone` for what it counts toward (unset means backlog; a sub-task inherits its nearest ancestor's milestone unless it sets its own). The ECHO parent edge is still set alongside, but only so deletion cascades — it is no longer the membership or hierarchy mechanism.

The new `Milestone` type (`org.dxos.type.milestone`) replaces the embedded `Goal` struct that `Project` used to carry: its `description` says what done means, and it deliberately stores **no** status, because progress is derived from the tasks filed under it. Linear and GitHub milestones now mirror onto it.

`Project` (`0.4.0`) drops two fields as a result: `goals` (milestones replace it) and `routines` — a routine reaches its project the same way it reaches any other object, through `instructions.objects`, which is what the routine companion already queries. `artifacts` becomes an inline ref array rather than a ref to a `Collection`. Note that deleting a project no longer cascade-deletes routines that reference it.

`SkillsAnnotation` moves from `@dxos/app-toolkit/AppAnnotation` to `@dxos/compute/Skill` (the annotation is id-keyed, so stored data is unaffected — only the import path changes). `Project` now carries the annotation (just its project skill — artifact-type skills are enabled on demand), which is what scopes a project's companion chats and template-created routines; the redundant `ProjectOperation.CreateRoutine` verb is removed — create routines through the automation companion's template menu (or `RoutineOperation.CreateRoutine`) instead.

Breaking for anyone reading these types directly: set membership must be read from `TaskSet.tasks` instead of `Query.children()`, task writes should go through the `taskCreate`/`taskUpdate`/`taskDelete`/`taskMove` verbs (which keep the array, the refs and the parent edges consistent), and `taskCreate`'s `parent` input is now `parentTask`. Type versions bump to `taskSet@0.3.0`, `task@0.3.0` and `project@0.4.0`; no migrations are provided.
