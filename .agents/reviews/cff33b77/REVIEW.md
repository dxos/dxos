---
branch: claude/gracious-planck-5zxbwp
commit: cff33b775564e74d1d6e1de4cbcf9ca68bd284a9
base: 714beb860a826d356789efb4ff847bcab8a0da65
mode: default
createdAt: 2026-09-07T02:08:53.365Z
isFinalized: true
groups: 20
rules: [inline-obj-parent, no-casts, no-sleep-in-test, no-trivial-wrappers-over-official-apis, obj-update-push, operations-take-refs-not-ids]
reviewId: cff33b77
---

_44 error(s), 102 warning(s)._

# ERROR cff33b77-1 no-casts `packages/common/log/src/context.test.ts:12:24`

The new test helper `entry = (init: { context?: any; error?: Error }) => …` widens `context` to `any` instead of a real type, per the `no-casts` rule's ban on widened `any` in signatures. `getContextFromEntry` only needs `context` to be `unknown` (it narrows internally), so typing it `unknown` (or the narrowest union of shapes the tests actually pass) keeps the checker honest without losing the test's flexibility.

# ERROR cff33b77-2 no-casts `packages/common/util/src/instance-id.ts:18:31`

`const NULL_PROTOTYPE = ((globalThis as any)[Symbol.for('dxos.null-prototype')] ??= Object.freeze({}));` is a newly-added `as any` cast on `globalThis`, which the `no-casts` rule flags. Fix at the source by declaring the symbol-keyed property on a typed augmentation of `globalThis` (as is already needed for `instanceContexts` above it) instead of casting to `any` at each use.

# WARN cff33b77-3 obj-update-push `packages/core/compute/assistant-evals/src/runner.ts:273:13`

Inside the `Obj.update(instructions, ...)` callback, `instructions.objects = [...(instructions.objects ?? []), ...objects]` appends to the object's own array field via a spread copy. Per `obj-update-push`, replace with an in-place `.push(...objects)` (guarding for the not-yet-initialized case, e.g. `instructions.objects ??= []; instructions.objects.push(...objects);`) to keep the append O(1) instead of the O(n) Automerge array-spread cost.

# WARN cff33b77-4 obj-update-push `packages/core/compute/assistant-toolkit/src/types/Chat.test.ts:130:11`

Inside `Obj.update(chat, ...)`, `chat.tasks = [...chat.tasks, Ref.make(delegated)]` reassigns the array via spread to append one ref. Per `obj-update-push`, use `chat.tasks.push(Ref.make(delegated))` instead.

# WARN cff33b77-5 obj-update-push `packages/core/compute/assistant/src/types/Chat.ts:82:7`

Inside `Obj.update(subject, ...)`, `Annotation.set(subject, CompanionChatAnnotation, [...chats, Ref.make(chat)])` builds the new annotation value by spreading the existing array plus one new ref — an append done via a full array copy. Per `obj-update-push`, mutate the existing array in place (e.g. read it, `chats.push(Ref.make(chat))`, per `Annotation.ts`'s own guidance to use `Annotation.update`/in-place splices for this) rather than reassigning a spread copy.

# WARN cff33b77-6 obj-update-push `packages/core/compute/assistant/src/types/Chat.ts:97:5`

Inside `Obj.update(chat, ...)` (`addTask`), `chat.tasks = [...chat.tasks, Ref.make(task)]` appends via spread. Per `obj-update-push`, replace with `chat.tasks.push(Ref.make(task))`.

# WARN cff33b77-7 inline-obj-parent `packages/core/compute/assistant/src/types/Chat.ts:101`

`addTask` creates the task via `db.add(Task.make({ title: title.trim(), status: 'todo', ...props }))` while `chat` is already in scope, then calls `Obj.setParent(task, chat)` on the next line. Per `inline-obj-parent`, pass the parent at make time instead: `Task.make({ [Obj.Parent]: chat, title: title.trim(), status: 'todo', ...props })`, dropping the separate `Obj.setParent` call.

# WARN cff33b77-8 obj-update-push `packages/core/compute/assistant/src/types/Chat.ts:124:5`

Inside `Obj.update(chat, ...)` (`assignTasks`), `chat.tasks = [...chat.tasks, ...added]` appends the collected refs via spread. Per `obj-update-push`, push the collected items in place instead, e.g. `chat.tasks.push(...added)`.

# WARN cff33b77-9 obj-update-push `packages/core/compute/compute/src/types/Project.ts:104:5`

Inside `Obj.update(project, ...)` (`addRoutine`), `project.routines = [...project.routines, Ref.make(routine)]` appends via spread. Per `obj-update-push`, use `project.routines.push(Ref.make(routine))`.

# WARN cff33b77-10 inline-obj-parent `packages/core/echo/echo-client-e2e/src/storage-metrics.test.ts:156`

`parent` (line 154) exists before `child` is created (line 155), then `Obj.setParent(child, parent)` follows. The test is about garbage collection of transitively-deleted objects, not about `setParent` itself, so the parent is knowable at construction: use `Obj.make(TestSchema.Expando, { [Obj.Parent]: parent, name: 'child' })` instead of the two-step call.

# ERROR cff33b77-11 no-casts `packages/core/echo/echo-client/src/echo-handler/unregistered-type.test.ts:78:7`

`(object as any).name = 42;` casts to `any` to write a value the schema's real type (`name?: string`) rejects. Per `no-casts`, suppressing the checker this way hides the type at its source; since the test's whole point is writing an invalid value, prefer a narrow, explicit escape such as a locally-typed `Obj.Unknown`/mutable-record accessor over `any`, or a helper that documents the deliberate schema violation instead of a bare `any` cast.

# ERROR cff33b77-12 no-casts `packages/core/echo/echo-client/src/echo-handler/unregistered-type.test.ts:80:12`

`expect((object as any).name).toEqual(42);` repeats the same `as any` cast flagged at line 78 to read back the value — same fix applies: give the read a real (even if intentionally loose) type instead of `any`.

# ERROR cff33b77-13 no-casts `packages/core/echo/echo-client/src/echo-handler/unregistered-type.test.ts:92:9`

`(object as any).name = 42;` inside the second test is the same newly-introduced `as any` violation as line 78 — apply the same fix (a properly typed accessor instead of `any`).

# WARN cff33b77-14 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-repo-subduction-policy.test.ts:80`

`await sleep(NEGATIVE_ASSERTION_DELAY_MS);` waits a fixed real duration before asserting a `findWithProgress(...).peek().state` is NOT `'ready'`; the same shape (also `sleep(1_500)`) recurs throughout the file at lines 180, 228, 363, 424, 467, 503, 527, 533, 806, 853, 862, 906, 913, 964, 1007, 1040 and 1080. Per `no-sleep-in-test`, a fixed sleep to prove a negative is exactly the flaky pattern the rule targets — anchor the assertion on an observable positive signal instead (e.g. a control doc that DOES replicate within the same window, as several of these tests already do) rather than guessing that the window is long enough for nothing to have happened.

# WARN cff33b77-15 inline-obj-parent `packages/core/echo/echo/src/Obj.test.ts:111`

In `'getSnapshot preserves parent'`, `parent` (line 109) is created before `child` (line 110), then parented via `Obj.setParent(child, parent)`. Since the test is about `getSnapshot`, not about `setParent`, the parent should be supplied inline: `Obj.make(TestSchema.Person, { [Obj.Parent]: parent, name: 'child' })`.

# WARN cff33b77-16 inline-obj-parent `packages/core/echo/echo/src/Query.test.ts:873`

`parent` (line 871) is created before `child` (line 872) and then `Obj.setParent(child, parent)` is called to set up a `hasParent`/`toPredicate` test. The parent is known at construction time, so build `child` with `Obj.make(TestSchema.Person, { [Obj.Parent]: parent, name: 'Child' })` instead of the separate call.

# WARN cff33b77-17 no-sleep-in-test `packages/core/mesh/rpc/src/rpc.test.ts:145`

`await sleep(5); expect(open).toEqual(false);` in `'open hangs on half-open streams'` asserts a negative ("hasn't opened yet") after an arbitrary 5ms real delay. This is inherently racy — a slow runner can make the sleep too short and the assertion falsely pass — per `no-sleep-in-test`; observe the pending state via an explicit signal (e.g. instrument the port/handshake to fire a `Trigger` on progress) rather than sleeping then checking.

# ERROR cff33b77-18 no-casts `packages/devtools/cli/src/observability.test.ts:36:7`

The fake `observability` object is built with `as unknown as Parameters<typeof identifySession>[0]` — the double-cast escape hatch the `no-casts` rule explicitly names. Fix at the source by giving `identifySession` (or this test) a narrow interface for the subset of `Observability.Observability` it actually calls (`alias`/`identify`) so the fake can satisfy it structurally without a cast.

# ERROR cff33b77-19 no-casts `packages/devtools/cli/src/observability.test.ts:37:20`

`const client = { halo: { identity: { get: () => ({ did: DID }) } } } as unknown as Parameters<typeof identifySession>[1];` is another `as unknown as T` double-cast, this time for the `Client` parameter. Same fix as line 36: narrow `identifySession`'s parameter type (e.g. `Pick<Client, 'halo'>` or a small local interface) so the literal test object satisfies it directly.

# ERROR cff33b77-20 no-casts `packages/devtools/cli/src/observability.test.ts:57:7`

Same `as unknown as Parameters<typeof identifySession>[0]` double-cast pattern as line 36, repeated in the "no identity" test — flagged per `no-casts`; fix by narrowing the parameter type once rather than re-casting at every call site.

# ERROR cff33b77-21 no-casts `packages/devtools/cli/src/observability.test.ts:58:20`

Same `as unknown as Parameters<typeof identifySession>[1]` double-cast pattern as line 37 — flagged per `no-casts` for the same reason and with the same fix (narrow the real parameter type).

# WARN cff33b77-22 obj-update-push `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.stories.tsx:38:7`

Inside `Obj.update(publication, ...)`, `publication.posts = [...(publication.posts ?? []), Ref.make(post)]` appends one post via spread, run once per seeded post in a loop. Per `obj-update-push`, push in place instead, e.g. `publication.posts ??= []; publication.posts.push(Ref.make(post));`.

# WARN cff33b77-23 obj-update-push `packages/plugins/plugin-blogger/src/operations/add-post.ts:32:7`

Inside `Obj.update(publication, ...)`, `publication.posts = [...(publication.posts ?? []), Ref.make(post)]` appends the new post via spread. Per `obj-update-push`, push in place instead of reassigning a spread copy.

# WARN cff33b77-24 obj-update-push `packages/plugins/plugin-blogger/src/operations/sync-posts.ts:89:9`

Inside `Obj.update(publication, ...)`, `publication.posts = [...(publication.posts ?? []), Ref.make(post)]` appends via spread — notably the adjacent comment already describes this as "pushing `Ref.make(post)` onto `posts`", but the code does a spread-reassign instead of an actual `.push`. Per `obj-update-push`, change it to a real `.push(Ref.make(post))`.

# WARN cff33b77-25 obj-update-push `packages/plugins/plugin-blogger/src/operations/sync.test.ts:102:5`

Inside `Obj.update(publication, ...)`, `publication.posts = [...(publication.posts ?? []), Ref.make(post)]` appends via spread. Per `obj-update-push`, use `.push(Ref.make(post))` instead.

# WARN cff33b77-26 obj-update-push `packages/plugins/plugin-code/src/operations/hello-world.ts:48:9`

Inside `Obj.update(code, ...)`, `const next = [...(code.files ?? []), Ref.make(added)]; code.files = next;` appends the new file ref via spread. Per `obj-update-push`, push onto the existing array in place instead, e.g. `code.files ??= []; code.files.push(Ref.make(added));`.

# WARN cff33b77-27 obj-update-push `packages/plugins/plugin-code/src/operations/scaffold-project.ts:96:11`

Inside `Obj.update(code, ...)`, `const next = [...(code.files ?? []), ...additions.map((entry) => entry.ref)]; code.files = next;` appends the newly-added file refs via spread. Per `obj-update-push`, push the mapped refs in place instead, e.g. `code.files ??= []; code.files.push(...additions.map((entry) => entry.ref));`.

# WARN cff33b77-28 obj-update-push `packages/plugins/plugin-code/src/operations/write-file.ts:32:9`

Inside `Obj.update(code, ...)`, `const next = [...(code.files ?? []), Ref.make(added)]; code.files = next;` appends via spread — same pattern as `hello-world.ts`. Per `obj-update-push`, push in place instead of reassigning a spread copy.

# WARN cff33b77-29 inline-obj-parent `packages/plugins/plugin-crm/src/operations/research.ts:56`

`upsertProfile` creates `profile` via `Markdown.make({...})` while `subject` (the function parameter) is already known, then immediately calls `Obj.setParent(profile, subject)`. Per `inline-obj-parent`, the parent should be passed at construction instead of set afterward — either extend `Markdown.make` to forward `[Obj.Parent]` or construct via `Obj.make(Markdown.Document, { ..., [Obj.Parent]: subject })` directly.

# ERROR cff33b77-30 no-casts `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:26:18`

The new `rowName = (type: any, typename: string | undefined): string =>` widens `type` to `any`, which `no-casts` flags as a widened-`any` signature. `type` only needs an optional `presetLabel: string` read off it, so a narrow structural type (e.g. `{ presetLabel?: string }`, or the real preset/type union used by `types: any[]` callers) fixes the type at its source instead of opting out of checking entirely.

# WARN cff33b77-31 obj-update-push `packages/plugins/plugin-github/src/operations/sync.ts:172`

Inside `Obj.update(container, ...)`, `container.tasks = [...container.tasks, Ref.make(task)];` reassigns the array via spread instead of appending. Per `obj-update-push`, replace with `container.tasks.push(Ref.make(task));` to keep the append O(1) on the Automerge-backed array.

# WARN cff33b77-32 obj-update-push `packages/plugins/plugin-github/src/operations/sync.ts:224`

Inside `Obj.update(existing, ...)`, `existing.identities = [...ids, { label: 'github', value: user.login }];` spread-copies `ids` (aliasing `existing.identities`) to append one entry. Use `existing.identities.push({ label: 'github', value: user.login })` instead (initializing the array first if it can be undefined), per `obj-update-push`.

# WARN cff33b77-33 obj-update-push `packages/plugins/plugin-github/src/operations/sync.ts:324`

Inside `Obj.update(taskSet, ...)`, `taskSet.milestones = [...taskSet.milestones, Ref.make(milestone)];` is a spread-append; replace with `taskSet.milestones.push(Ref.make(milestone));` per `obj-update-push`.

# WARN cff33b77-34 inline-obj-parent `packages/plugins/plugin-ibkr/src/operations/sync-lots.ts:82`

In the "create" branch, `lot` is made via `Obj.make(Ibkr.Lot, { [Obj.Meta]: ..., ...fields })` (line 76-81) while `portfolio` is already in scope (loaded at line 19/passed as a parameter), then `Obj.setParent(lot, portfolio)` follows on the next line. Add `[Obj.Parent]: portfolio` to the `Obj.make` props instead of the trailing `Obj.setParent` call.

# WARN cff33b77-35 inline-obj-parent `packages/plugins/plugin-ibkr/src/sync.ts:65`

`trigger` is unconditionally created via `Trigger.make({...})` while `portfolio` is already a known function parameter, then `Obj.setParent(trigger, portfolio)` is called right after. `Trigger.make` forwards `Obj.MakeProps`, so this can be `Trigger.make({ [Obj.Parent]: portfolio, enabled: true, spec: ..., runnable: ... })`, dropping the separate call.

# WARN cff33b77-36 inline-obj-parent `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:179`

`handleCreate` builds `event` via `DraftEvent.make({...})` while `subject` is already in scope (component prop/state), then calls `Obj.setParent(event, subject)`. `DraftEvent.make` forwards to `Event.make`, whose props type is `Obj.MakeProps<typeof Event>`, so `[Obj.Parent]: subject` can be added directly to the `DraftEvent.make` call instead of the follow-up `Obj.setParent`.

# WARN cff33b77-37 inline-obj-parent `packages/plugins/plugin-inbox/src/types/Mailbox.test.ts:97`

`mailbox` (line 88) exists before `annotations` is created via `Feed.make()` (line 96), then `Obj.setParent(annotations, mailbox)` follows. `Feed.make` forwards `Obj.MakeProps`, so this can be `Feed.make({ [Obj.Parent]: mailbox })` instead of the separate `setParent` call.

# WARN cff33b77-38 inline-obj-parent `packages/plugins/plugin-inbox/src/types/SystemTags.ts:152`

In `toggleTag`, the tag index is created lazily via `db.add(TagIndex.make())` while `container` is already the function's own parameter, then `Obj.setParent(index, container)` is called before the `container.tags` ref is even written. Since the parent is known at construction, this should set the parent inline (extending `TagIndex.make` to accept `[Obj.Parent]`, or constructing via `Obj.make(TagIndex.TagIndex, { index: {}, [Obj.Parent]: container })`) rather than the standalone `Obj.setParent` call.

# WARN cff33b77-39 inline-obj-parent `packages/plugins/plugin-inbox/src/types/SystemTags.ts:189`

Same pattern as `toggleTag` above: in `applyTagToAll`, `index = db.add(TagIndex.make())` is immediately followed by `Obj.setParent(index, container)` while `container` was already known. Inline the parent at construction instead of calling `Obj.setParent` afterward.

# WARN cff33b77-40 obj-update-push `packages/plugins/plugin-linear/src/operations/sync.ts:143`

Inside `Obj.update(container, ...)`, `container.tasks = [...container.tasks, Ref.make(task)];` should be `container.tasks.push(Ref.make(task));` per `obj-update-push` — the spread copy is O(n) per append on the live Automerge array.

# WARN cff33b77-41 obj-update-push `packages/plugins/plugin-linear/src/operations/sync.ts:236`

Inside `Obj.update(taskSet, ...)`, `taskSet.milestones = [...taskSet.milestones, Ref.make(milestone)];` should use `taskSet.milestones.push(Ref.make(milestone));` per `obj-update-push`.

# WARN cff33b77-42 obj-update-push `packages/plugins/plugin-magazine/src/containers/MagazineArticle/useToolbar.tsx:86`

Inside `Obj.update(magazine, ...)`, `magazine.feeds = [...magazine.feeds, Ref.make(subscription)];` reassigns via spread; use `magazine.feeds.push(Ref.make(subscription));` per `obj-update-push`.

# WARN cff33b77-43 operations-take-refs-not-ids `packages/plugins/plugin-markdown/src/types/MarkdownOperation.ts:135:5`

`ScrollToAnchor`'s optional `id` field is typed `Schema.String` ("Reference ID (e.g. thread ID)"), but the handler (`operations/scroll-to-anchor.ts`) uses it as a comment-thread id, and the call site in `plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx` passes it the space-visible `threadId` of a `Thread.Thread` ECHO object. Per `operations-take-refs-not-ids`, this should be `Ref.Ref(Thread.Thread)` (or at least `Type.getSchema(Thread.Thread)`, matching how other operations in this codebase name a thread) instead of a bare string, so the type rides with the identity and the handler does not have to re-derive what it points at.

# ERROR cff33b77-44 no-casts `packages/plugins/plugin-onboarding/scripts/sample/drawings.ts:58:13`

`schema: tlSchema as any,` casts the schema built by `createTLSchema` to `any` to satisfy `Store`'s constructor options — a `no-casts` violation. Since `tlSchema`'s real type is already known from `createTLSchema`, the cast should be removed in favor of typing `makeTLCanvas`'s `Store` construction against the actual `@tldraw/store` option types (or a narrow local type alias), not `any`.

# ERROR cff33b77-45 no-casts `packages/plugins/plugin-onboarding/scripts/sample/drawings.ts:59:13`

`props: { … } as any,` casts the store's props object to `any`, the same `no-casts` violation as the adjacent `schema` line — type the props object against `Store`'s real options type instead of suppressing the check.

# ERROR cff33b77-46 no-casts `packages/plugins/plugin-onboarding/scripts/sample/drawings.ts:64:29`

`PageRecordType.create({ id: pageId as any, name: pageName, index: 'a1' as IndexKey })` casts `pageId` to `any` where `PageRecordType.create` expects a specific branded id type. Per `no-casts`, cast at the source instead — e.g. brand `pageId` as the record's id type (similar to how `index: 'a1' as IndexKey` already does for `index`) rather than escaping to `any`.

# ERROR cff33b77-47 no-casts `packages/plugins/plugin-onboarding/scripts/sample/drawings.ts:122:5`

`}) as unknown as TLRecord;` is a double-cast (`as unknown as T`) on the geo shape literal returned from `tlGeo`, explicitly named by `no-casts` as the escape hatch to avoid. The function is already declared `: TLRecord`, so the literal should be shaped to satisfy that return type directly (or via a real `TLRecord`-producing constructor as used elsewhere in this file for `DocumentRecordType`/`PageRecordType`) instead of double-casting past it.

# WARN cff33b77-48 obj-update-push `packages/plugins/plugin-projects/src/capabilities/app-graph-builder.ts:361`

Inside `Obj.update(project, ...)`, `project.artifacts = [...project.artifacts, ref];` should be `project.artifacts.push(ref);` per `obj-update-push`.

# WARN cff33b77-49 inline-obj-parent `packages/plugins/plugin-projects/src/capabilities/project-chats.test.ts:105`

`project` (from `setupTestContext`) is already in scope when `other` is created via `db.add(Feed.make())` (line 104), then `Obj.setParent(other, project)` follows. Use `Feed.make({ [Obj.Parent]: project })` instead.

# WARN cff33b77-50 inline-obj-parent `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:81`

`project` (line 61) and `instructions` (line 74) both exist before `Obj.setParent(instructions, project)` is called at line 81. The parent is known when `instructions` is constructed, so it can be passed inline instead of the trailing `setParent` call.

# WARN cff33b77-51 inline-obj-parent `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:84`

`taskSet` (resolved at line 62) is already known when `task` is made via `Task.make({...})` (line 83), then `Obj.setParent(task, taskSet)` follows. `Task.make` forwards `Obj.MakeProps`, so use `Task.make({ [Obj.Parent]: taskSet, title: TASK_TITLE, status: 'todo' })`.

# WARN cff33b77-52 inline-obj-parent `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:88`

Same as the previous finding: `linkTask` is created via `Task.make({...})` (lines 85-87) while `taskSet` is already in scope, then `Obj.setParent(linkTask, taskSet)` is called. Pass `[Obj.Parent]: taskSet` in the `Task.make` call instead.

# WARN cff33b77-53 inline-obj-parent `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:117`

In the `addTask` helper, `task` is made via `Task.make({...})` while `taskSet` (a function parameter) is already known, then `Obj.setParent(task, taskSet)` follows on the next line. Inline `[Obj.Parent]: taskSet` into the `Task.make` call instead.

# WARN cff33b77-54 obj-update-push `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:119`

Inside `Obj.update(taskSet, ...)`, `taskSet.tasks = [...taskSet.tasks, Ref.make(task)];` should be `taskSet.tasks.push(Ref.make(task));` per `obj-update-push`.

# WARN cff33b77-55 inline-obj-parent `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:452`

`milestone` is created unconditionally via `Milestone.make({...})` while `taskSet` is already in scope, then `Obj.setParent(milestone, taskSet)` is called immediately after. `Milestone.make` forwards `Obj.MakeProps`, so use `Milestone.make({ [Obj.Parent]: taskSet, name: MILESTONE_NAME })`.

# WARN cff33b77-56 obj-update-push `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:454`

Inside `Obj.update(taskSet, ...)`, `taskSet.milestones = [...taskSet.milestones, Ref.make(milestone)];` should be `taskSet.milestones.push(Ref.make(milestone));` per `obj-update-push`.

# WARN cff33b77-57 obj-update-push `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:476`

Inside `Obj.update(project, ...)`, `project.artifacts = [...project.artifacts, Ref.make(artifact)];` should be `project.artifacts.push(Ref.make(artifact));` per `obj-update-push`.

# WARN cff33b77-58 obj-update-push `packages/plugins/plugin-projects/src/operations/artifact-add.ts:27`

Inside `Obj.update(project, ...)`, `project.artifacts = [...project.artifacts, objectRef];` should be `project.artifacts.push(objectRef);` per `obj-update-push`.

# WARN cff33b77-59 inline-obj-parent `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts:61`

`taskSet` (loaded at line 58) is already known when `task` is created via `Task.make({...})` (line 60), then `Obj.setParent(task, taskSet)` follows. Use `Task.make({ [Obj.Parent]: taskSet, title: 'Write a poem', status: 'todo' })` instead.

# WARN cff33b77-60 inline-obj-parent `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.test.ts:129`

Same pattern inside the `taskIn` helper: `taskSet` is already resolved when `task` is created via `Task.make({...})` (line 128), then `Obj.setParent(task, taskSet)` is called right after. Inline the parent instead.

# WARN cff33b77-61 obj-update-push `packages/plugins/plugin-projects/src/operations/delegate-task-to-chat.ts:73`

Inside `Obj.update(chat, ...)`, `chat.tasks = [...chat.tasks, ...tasks.map((task) => Ref.make(task))];` spread-appends multiple refs at once; use `chat.tasks.push(...tasks.map((task) => Ref.make(task)));` per `obj-update-push` to append via `push` instead of copying the whole array.

# WARN cff33b77-62 inline-obj-parent `packages/plugins/plugin-projects/src/operations/delete-project.test.ts:52`

`project` (line 47) exists before `instructions` is created via `Instructions.make({...})` (line 48), then `Obj.setParent(instructions, project)` is called at line 52. The parent is known at construction time, so it should be supplied there instead of via the trailing call.

# WARN cff33b77-63 obj-update-push `packages/plugins/plugin-projects/src/operations/delete-project.test.ts:150`

Inside `Obj.update(project, ...)`, `project.artifacts = [...project.artifacts, Ref.make(artifact)];` should be `project.artifacts.push(Ref.make(artifact));` per `obj-update-push`.

# WARN cff33b77-64 inline-obj-parent `packages/plugins/plugin-projects/src/operations/get-project.test.ts:28`

`taskSet` (line 25) is created before `open` (line 26), then `Obj.setParent(open, taskSet)` is called. Use `Task.make({ [Obj.Parent]: taskSet, title: 'Open', status: 'todo' })` instead.

# WARN cff33b77-65 inline-obj-parent `packages/plugins/plugin-projects/src/operations/get-project.test.ts:29`

Same as the previous finding, for `done`: `taskSet` already exists when `done` is created (line 27), then `Obj.setParent(done, taskSet)` follows. Inline the parent into the `Task.make` call instead.

# WARN cff33b77-66 obj-update-push `packages/plugins/plugin-projects/src/operations/mailbox/helpers.ts:35`

Inside `Obj.update(project, ...)`, `project.artifacts = [...project.artifacts, Ref.make(document)];` should be `project.artifacts.push(Ref.make(document));` per `obj-update-push`.

# WARN cff33b77-67 obj-update-push `packages/plugins/plugin-projects/src/operations/mailbox/helpers.ts:70`

Inside `Obj.update(taskSet, ...)`, `taskSet.tasks = [...taskSet.tasks, Ref.make(task)];` should be `taskSet.tasks.push(Ref.make(task));` per `obj-update-push`.

# WARN cff33b77-68 inline-obj-parent `packages/plugins/plugin-projects/src/operations/mailbox/helpers.ts:72`

`taskSet` is loaded at line 66, before `task` is created via `Obj.make(Task.Task, {...})` at line 67, then `Obj.setParent(task, taskSet)` follows at line 72 (after the membership-array update). Add `[Obj.Parent]: taskSet` to the `Obj.make` props instead of the separate call.

# WARN cff33b77-69 obj-update-push `packages/plugins/plugin-qa/src/operations/set-case.ts:40`

Inside `Obj.update(plan, ...)`, `plan.cases = [...plan.cases, Ref.make(created)];` should be `plan.cases.push(Ref.make(created));` per `obj-update-push`.

# WARN cff33b77-70 operations-take-refs-not-ids `packages/plugins/plugin-review/src/types/CommentOperation.ts:135:5`

`DeleteMessage`'s `messageId: Schema.String` names one of `thread.messages` — a `Ref.Ref(Message.Message)` array, i.e. genuine `Message.Message` ECHO objects (the handler loads `thread.messages[msgIndex].load()`). Per `operations-take-refs-not-ids`, this should take `Ref.Ref(Message.Message)` instead of a raw id string, consistent with `AddMessage`/`RestoreMessage` in the same file which pass typed refs for the objects they touch.

# WARN cff33b77-71 obj-update-push `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:69`

Inside `Obj.update(automation, ...)`, `automation.triggers = [...automation.triggers, Ref.make(trigger)];` should be `automation.triggers.push(Ref.make(trigger));` per `obj-update-push`.

# WARN cff33b77-72 obj-update-push `packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:61`

Inside `Obj.update(existingSkill, ...)`, `existingSkill.tools = [...(existingSkill.tools ?? []), toolId];` spread-appends a single id; use `(existingSkill.tools ??= []).push(toolId);` (or push after initializing the field) per `obj-update-push`.

# WARN cff33b77-73 operations-take-refs-not-ids `packages/plugins/plugin-space/src/types/SpaceOperation.ts:656:5`

`MergeDuplicates`'s `objectIds: Schema.Array(Schema.String)` names the ECHO objects to merge (the handler runs `Filter.id(...objectIds)` against the database). Per `operations-take-refs-not-ids`, this should be `Schema.Array(Ref.Ref(Obj.Unknown))`, matching how the rest of this same file (`AddTag`, `RemoveTag`, `GetObjects`, `QueryObjects`) identifies objects by `Ref.Ref(Obj.Unknown)` rather than by bare id.

# WARN cff33b77-74 inline-obj-parent `packages/plugins/plugin-studio/src/components/ArtifactCard/ArtifactCard.stories.tsx:68`

`artifact` (line 64) exists before `variant` is created via `Variant.make({...})` (lines 65-67), then `Obj.setParent(variant, artifact)` follows. Pass `[Obj.Parent]: artifact` in the `Variant.make` call instead.

# WARN cff33b77-75 inline-obj-parent `packages/plugins/plugin-studio/src/containers/ArtifactArticle/ArtifactArticle.stories.tsx:116`

`artifact` (line 103) is already added before each `variant` is created inside the loop (lines 107-115), then `Obj.setParent(variant, artifact)` is called. Inline `[Obj.Parent]: artifact` into each `Variant.make` call instead.

# WARN cff33b77-76 inline-obj-parent `packages/plugins/plugin-studio/src/containers/ArtifactsArticle/ArtifactsArticle.stories.tsx:60`

`artifact` (line 53) is created before `variant` (lines 54-59) inside the loop, then `Obj.setParent(variant, artifact)` follows. Use `Variant.make({ [Obj.Parent]: artifact, ... })` instead.

# WARN cff33b77-77 inline-obj-parent `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.stories.tsx:72`

`artifact` (line 65) is already created when `variant` is made (lines 66-71), then `Obj.setParent(variant, artifact)` follows at line 72. Inline `[Obj.Parent]: artifact` into the `Variant.make` call instead.

# WARN cff33b77-78 inline-obj-parent `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.stories.tsx:77`

`collection` (line 61) is already known when `artifact` is created (line 65), then `Obj.setParent(artifact, collection)` is called at line 77. Since `collection` was in scope before `artifact`'s construction, pass `[Obj.Parent]: collection` to `Artifact.make` (extending its narrow props type, or constructing via `Obj.make(Artifact, {...})` directly) instead of the trailing call.

# WARN cff33b77-79 inline-obj-parent `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:76`

In `handleCreate`, `collection` (the `subject` prop) is already in scope when `artifact = Artifact.make()` is created (line 75), then `Obj.setParent(artifact, collection)` follows immediately. Since `Artifact.make`'s current signature doesn't forward extra props, either extend it to accept `[Obj.Parent]`, or construct with `Obj.make(Artifact, { name, kind, variants: [], [Obj.Parent]: collection })` directly instead of the separate `setParent` call.

# WARN cff33b77-80 obj-update-push `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:79`

Inside `Obj.update(collection, ...)`, `collection.objects = [...(collection.objects ?? []), Ref.make(artifact)]` appends one ref by spreading the live array — O(n) under Automerge. Use `collection.objects.push(Ref.make(artifact))` instead (initializing `collection.objects = collection.objects ?? []` first if it can be undefined).

# WARN cff33b77-81 inline-obj-parent `packages/plugins/plugin-studio/src/containers/LightboxArticle/LightboxArticle.stories.tsx:72`

`artifact` (line 65) is created before `variant` (lines 66-71) inside the loop, then `Obj.setParent(variant, artifact)` follows. Inline `[Obj.Parent]: artifact` into the `Variant.make` call instead.

# WARN cff33b77-82 inline-obj-parent `packages/plugins/plugin-studio/src/operations/generate.test.ts:216`

`artifact` (line 213) already exists when `pending` is created via `Variant.make({...})` (line 215), then `Obj.setParent(pending, artifact)` follows. Use `Variant.make({ [Obj.Parent]: artifact, jobId: 'job-123', config: {} })` instead.

# WARN cff33b77-83 obj-update-push `packages/plugins/plugin-studio/src/operations/generate.ts:108`

Inside `Obj.update(artifactObj, ...)`, `artifactObj.variants = [...(artifactObj.variants ?? []), Ref.make(created)]` appends a single variant via spread. Replace with `artifactObj.variants.push(Ref.make(created))` (defaulting the field to `[]` first if needed) per the `Obj.update` push rule.

# WARN cff33b77-84 obj-update-push `packages/plugins/plugin-studio/src/operations/generate.ts:130`

Same pattern as line 108: `artifactObj.variants = [...(artifactObj.variants ?? []), Ref.make(created)]` inside `Obj.update` should be `artifactObj.variants.push(Ref.make(created))`.

# WARN cff33b77-85 obj-update-push `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:103`

Inside `Obj.update(set, ...)`, `set.tasks = [...set.tasks, Ref.make(task)]` appends via spread. Use `set.tasks.push(Ref.make(task))`.

# WARN cff33b77-86 obj-update-push `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:108`

Inside `Obj.update(set, ...)`, `set.milestones = [...set.milestones, Ref.make(milestone)]` appends via spread. Use `set.milestones.push(Ref.make(milestone))`.

# WARN cff33b77-87 obj-update-push `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:241`

Inside `Obj.update(taskSet, ...)`, `taskSet.tasks = [...taskSet.tasks, Ref.make(added)]` appends via spread. Use `taskSet.tasks.push(Ref.make(added))`.

# WARN cff33b77-88 obj-update-push `packages/plugins/plugin-tasks/src/operations/list-tasks.test.ts:85`

Inside `Obj.update(taskSet, ...)`, `taskSet.tasks = [...taskSet.tasks, db.makeRef(...)]` appends via spread. Use `taskSet.tasks.push(db.makeRef(...))`.

# WARN cff33b77-89 inline-obj-parent `packages/plugins/plugin-tasks/src/operations/update-task.test.ts:108`

`parent` (line 103) is created before `child` (line 104), and `child` is then given `parent` as its ECHO parent via `Obj.setParent(child, parent)` at line 108 — after the `parentTask` ref has already been assigned. Since `parent` was known at construction time, build `child` with `Obj.make(Task.Task, { [Obj.Parent]: parent, title: 'Child', status: 'todo' })` instead.

# WARN cff33b77-90 obj-update-push `packages/plugins/plugin-trello/src/operations/sync.ts:215`

Inside `Obj.update(kanban, ...)`, `kanban.spec.items = [...(kanban.spec.items as ReadonlyArray<...>), ...newRefs]` appends a batch of new refs by spreading the existing array. Use `kanban.spec.items.push(...newRefs)` (as a mutable array) instead — O(1) per Automerge append vs O(n) for the spread copy.

# WARN cff33b77-91 inline-obj-parent `packages/plugins/plugin-trip/src/operations/merge-trip.test.ts:85`

`source` (line 81) is created before `booking` (line 84), then `Obj.setParent(booking, source)` follows at line 85. `Booking.make` forwards `Obj.MakeProps`, so use `Booking.make({ [Obj.Parent]: source, confirmationCode: 'SRC1', source: 'email' })` instead.

# WARN cff33b77-92 obj-update-push `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:94`

Inside `Obj.update(dream, ...)` (`handleAdd`), `dream.sequences = [...(dream.sequences ?? []), sequence]` appends the new sequence via spread. Use `dream.sequences.push(sequence)` (defaulting to `[]` first if needed).

# WARN cff33b77-93 no-sleep-in-test `packages/sdk/app-framework/src/ui/hooks/useApp.test.tsx:60`

`yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, 2 * STARTUP_WATCHDOG_TICK_MS)));` waits a fixed real duration so the test can assert `reported` stayed empty (no false start-up-failure report). Per `no-sleep-in-test`, this is a real-timer wait to synchronize with async work; `startup-watchdog.test.ts` in the same package already virtualizes this exact timer via `vi.useFakeTimers()`/`vi.advanceTimersByTime()` — do the same here instead of a real `setTimeout`.

# ERROR cff33b77-94 no-casts `packages/sdk/client-e2e/src/client-services.test.ts:150`

Non-null assertion `client1.halo.identity.get()!.identityKey` hides that `.get()` can return `undefined`; per the no-casts rule, narrow with a guard/assertion helper (e.g. `invariant(identity)`) or make the call site handle the `undefined` case instead of asserting it away.

# ERROR cff33b77-95 no-casts `packages/sdk/client-e2e/src/client-services.test.ts:151`

Same pattern as line 150: `client2.halo.identity.get()!.identityKey` uses `!` to silence the possibly-`undefined` return of `.get()`. Replace with an explicit guard rather than the assertion.

# ERROR cff33b77-96 no-casts `packages/sdk/client-e2e/src/client-services.test.ts:240`

`toPublicKey(guestInvitation!.spaceKey)!` stacks two non-null assertions (on `guestInvitation` and on the `toPublicKey` result). Both hide real `undefined` possibilities; assert/guard the invitation and key at the point they are produced instead.

# WARN cff33b77-97 no-sleep-in-test `packages/sdk/client-e2e/src/invitations.test.ts:71`

`await sleep(20);` in `successfulInvitation` waits an arbitrary real delay after the invitation reaches `SUCCESS` before asserting on downstream derived state (`host.dataSpaceManager!.spaces.get(...)`, `guest.dataSpaceManager!...`). Per `no-sleep-in-test`, prefer `waitForCondition`/`expect.poll` on that derived state (as the `DEVICE` branch a few lines below already does) instead of a fixed delay.

# ERROR cff33b77-98 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:78`

`host.dataSpaceManager!.spaces.get(toPublicKey(hostInvitation!.spaceKey)!)` chains three non-null assertions (`dataSpaceManager!`, `hostInvitation!`, and the `toPublicKey(...)!` result). Fix the underlying types (make `dataSpaceManager`/`hostInvitation` non-optional where they are known to exist, or guard explicitly) rather than asserting past them.

# ERROR cff33b77-99 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:79`

Same issue as line 78, mirrored for the guest side: `guest.dataSpaceManager!.spaces.get(toPublicKey(guestInvitation!.spaceKey)!)` stacks three non-null assertions.

# ERROR cff33b77-100 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:84`

`toPublicKey(guestInvitation!.identityKey)` and `host.identityManager.identity!.identityKey` both use non-null assertions to bypass possibly-`undefined` values; guard or fix the source types instead.

# ERROR cff33b77-101 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:85`

Same pattern as line 84 for the guest side: `guestInvitation!.identityKey` and `guest.identityManager.identity!.identityKey`.

# ERROR cff33b77-102 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:411`

`toPublicKey(invitation.get().swarmKey)!` asserts away a possibly-`undefined` result rather than handling it; per the no-casts rule, fix the type at its source.

# ERROR cff33b77-103 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:456`

Same as line 411: `toPublicKey(persistentInvitation.get().swarmKey)!` uses a non-null assertion instead of a real guard.

# ERROR cff33b77-104 no-casts `packages/sdk/client-e2e/src/invitations.test.ts:462`

Same as line 411/456: `toPublicKey(persistentInvitation.get().swarmKey)!`.

# ERROR cff33b77-105 no-casts `packages/sdk/client-e2e/src/spaces-invitations-subduction.test.ts:58`

`waitForSpace(client2, toPublicKey(guestInvitation!.spaceKey)!, ...)` stacks two non-null assertions (`guestInvitation!` and the `toPublicKey(...)!` result); guard/fix the types instead of asserting.

# ERROR cff33b77-106 no-casts `packages/sdk/client-e2e/src/spaces-invitations.test.ts:44`

Same pattern as `spaces-invitations-subduction.test.ts:58`: `toPublicKey(guestInvitation!.spaceKey)!` stacks two non-null assertions.

# ERROR cff33b77-107 no-casts `packages/sdk/client-e2e/src/spaces.test.ts:129`

`waitForSpace(client2, toPublicKey(guestInvitation!.spaceKey)!, ...)` again stacks two non-null assertions on `guestInvitation` and the `toPublicKey` result.

# WARN cff33b77-108 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:430`

`await sleep(50);` waits a fixed real delay to prove replication does *not* deliver `bobPersonalDoc` to `aliceSharedSpace` before asserting its absence. Per `no-sleep-in-test`, a fixed sleep for a negative assertion is exactly the flaky pattern the rule targets — anchor on a positive, already-replicated signal (e.g. a marker object created after `bobPersonalDoc` and observed via `waitForObject`) to bound the window deterministically instead of guessing 50ms.

# WARN cff33b77-109 no-sleep-in-test `packages/sdk/client-e2e/src/spaces.test.ts:447`

Same pattern as line 430: `await sleep(50);` guesses a window before asserting `doc1`/`doc2` never replicated to `eveSpaceB`, instead of anchoring on an observable signal, per `no-sleep-in-test`.

# WARN cff33b77-110 no-trivial-wrappers-over-official-apis `packages/sdk/client-e2e/src/spaces.test.ts:923:9`

`const createObject = <T extends {}>(props: T) => { return Obj.make(TestSchema$.Expando, props); };` is a local helper whose body is a single call forwarding straight through to `Obj.make` — no branching, no derived values, and no defaults added to `props`. Per `no-trivial-wrappers-over-official-apis`, this only renames the API: a reader hitting `createObject({ entries: [...] })` at the call sites (e.g. lines 546, 568) has to jump to the definition to learn it is really `Obj.make(TestSchema$.Expando, props)`. Inline the `Obj.make(TestSchema$.Expando, { ... })` call at each of the two call sites and delete the helper.

# ERROR cff33b77-111 no-casts `packages/sdk/client-services/src/packlets/invitations/invitation-state.ts:78`

`logStateUpdate`'s `actor` parameter is typed as the widened `any`, defeating type-checking for every call site. Give it a concrete type (e.g. the actual actor/session type used by callers) instead of `any`.

# WARN cff33b77-112 no-sleep-in-test `packages/sdk/client-services/src/packlets/invitations/invitations-handler.test.ts:63`

`await performAuth(guest, invitation); await sleep(15); expect(guest.ctx.disposed).to.be.true;` waits a fixed real delay hoping context disposal has completed before asserting it positively. The same `sleep(N); expect(...ctx.disposed).to.be...)` shape recurs throughout the file (e.g. lines 88, 107, 124, 139, 171, 191, 208, 230, 253), and lines 154 and 319 additionally busy-poll (`while (!guest.ctx.disposed) { ...; await sleep(10); }`). Per `no-sleep-in-test`, use `waitForCondition`/`expect.poll` on `ctx.disposed` (already imported into this file) instead of guessing a sufficient delay or polling on a fixed interval.

# ERROR cff33b77-113 no-casts `packages/sdk/client-services/src/packlets/invitations/space-invitation-protocol.test.ts:142`

`host.dataSpaceManager!.spaces.get(toPublicKey(invitation1!.spaceKey)!)!` chains three non-null assertions (`dataSpaceManager!`, `invitation1!`, and the trailing `.get(...)!`). Fix the source types or add explicit guards instead.

# ERROR cff33b77-114 no-casts `packages/sdk/client-services/src/packlets/invitations/space-invitation-protocol.test.ts:143`

Same as line 142, guest side: `guest.dataSpaceManager!.spaces.get(toPublicKey(invitation2!.spaceKey)!)!`.

# ERROR cff33b77-115 no-casts `packages/sdk/client-services/src/packlets/testing/test-builder.ts:240`

`this.identity!` non-null-asserts a value that may be `undefined`; guard against the missing case or change the surrounding type so `identity` is known non-null at this point.

# ERROR cff33b77-116 no-casts `packages/sdk/observability/src/extensions/otel/extension.ts:230`

`extension.close!()` uses a non-null assertion to call a possibly-`undefined` method; type `close` as required where it must always exist, or guard before calling.

# WARN cff33b77-117 obj-update-push `packages/sdk/types/src/types/Task.test.ts:345`

Inside `Obj.update(task, ...)`, `task.history = [...(task.history ?? []), { ... }]` appends one history entry via spread. Use `task.history.push({ ... })` instead.

# WARN cff33b77-118 obj-update-push `packages/sdk/types/src/types/Task.ts:320`

Inside `Obj.update(task, ...)` in `appendHistory`, `task.history = [...(task.history ?? []), entry]` appends one entry via spread. Use `task.history.push(entry)` (initializing the field to `[]` first if it can be undefined) per the `Obj.update` push rule.

# WARN cff33b77-119 obj-update-push `packages/sdk/types/src/types/Task.ts:433`

Inside `Obj.update(task, ...)` in `update`, `task.history = [...(task.history ?? []), entry]` appends one entry via spread — same fix as line 320: `task.history.push(entry)`.

# WARN cff33b77-120 obj-update-push `packages/sdk/types/src/types/Task.ts:461`

Inside `Obj.update(task, ...)`, `task.artifacts = [...(task.artifacts ?? []), Ref.make(artifact)]` appends via spread. Use `task.artifacts.push(Ref.make(artifact))`.

# WARN cff33b77-121 no-sleep-in-test `packages/sdk/worker-framework/src/Client.test.ts:221`

`await sleep(200); expect(calls).toBe(1);` waits a fixed real delay after the expected failure fires, hoping no further `onPersistentFailure` calls land, before asserting the escalation fired exactly once. Per `no-sleep-in-test`, this is a sleep-to-prove-a-negative: anchor on an observable positive signal (e.g. a subsequent successful reconnect/election cycle) that bounds the window deterministically, rather than guessing 200ms is enough for the count to have stabilized.

# WARN cff33b77-122 no-sleep-in-test `packages/sdk/worker-framework/src/Client.test.ts:252`

`await sleep(LOCK_OR_RPC_WAIT_TIMEOUT + 1_000); expect(follower.failures).toEqual([]);` uses a real-time sleep to outlive the lock/RPC timeout before asserting no failure was reported. Per `no-sleep-in-test`, prefer `vi.useFakeTimers()`/`vi.advanceTimersByTime()` (virtualizing the same timeout the production code waits on) so the assertion doesn't depend on real wall-clock elapsed time.

# WARN cff33b77-123 no-sleep-in-test `packages/sdk/worker-framework/src/Client.test.ts:419`

`await sleep(4_000); expect(leaderWorkers).toBeLessThanOrEqual(1 + 2);` waits a fixed real duration ("~20 port timeouts' worth of runway") hoping an unbounded steal loop would have shown itself by then, before asserting an upper bound. Per `no-sleep-in-test`, this is a real-timer wait standing in for a proper bound on the observed event count; drive the timeouts via `vi.useFakeTimers()` instead of real elapsed time.

# WARN cff33b77-124 inline-obj-parent `packages/stories/stories-assistant/src/stories/Chat.stories.tsx:90`

`project` (line 85) exists before `taskSet` is created via `TaskSet.make({})` (line 86), then `Obj.setParent(taskSet, project)` follows at line 90 (after the ref update). Pass `[Obj.Parent]: project` to the `TaskSet.make` call instead of the trailing `setParent`.

# WARN cff33b77-125 inline-obj-parent `packages/stories/stories-assistant/src/stories/Projects.stories.tsx:74`

`project` (line 65) is created before `instructions` (line 66), then `Obj.setParent(instructions, project)` is called at line 74. The parent is known when `instructions` is built, so it should be supplied there instead.

# WARN cff33b77-126 obj-update-push `packages/stories/stories-assistant/src/testing/objects.ts:30`

Inside `Obj.update(collection, ...)`, `collection.objects = [...collection.objects, ...refs]` appends the new refs via spread. Use `collection.objects.push(...refs)`.

# WARN cff33b77-127 inline-obj-parent `packages/stories/stories-inbox/src/testing/archive.ts:93`

`replaceFeed`'s `mailbox` parameter is already known when `next = Feed.make()` is created (line 92), then `Obj.setParent(next, mailbox)` follows immediately. Use `Feed.make({ [Obj.Parent]: mailbox })` instead of the separate call.

# WARN cff33b77-128 obj-update-push `packages/ui/react-ui-form/src/components/ObjectForm/ObjectForm.tsx:59`

Inside `Obj.update(object, ...)` (`handleCreate`), `Obj.getMeta(object).tags = [...Obj.getMeta(object).tags, Ref.make(newObject)]` appends one tag ref via spread. Use `Obj.getMeta(object).tags.push(Ref.make(newObject))` instead.

# ERROR cff33b77-129 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:262`

`toggle.closest('[data-part="branch"]')!` non-null-asserts the result of `closest`, which can legitimately return `null`; guard explicitly instead of asserting.

# WARN cff33b77-130 no-trivial-wrappers-over-official-apis `packages/ui/react-ui-menu/src/hooks/useMenuActions.test.tsx:14:7`

`createTestAction` is a module-local helper whose body is a single call to the package's own factory, `createMenuAction(id, () => {}, { label, icon: 'ph--star--regular' })` — it only renames `createMenuAction` while hardcoding the invoke callback and icon. Per `no-trivial-wrappers-over-official-apis`, inline the `createMenuAction(...)` call at each of the eight call sites in this file instead: the reader can then see which factory is being exercised and what it's passed without jumping to the helper's definition.

# ERROR cff33b77-131 no-casts `packages/ui/react-ui/src/components/Dialog/AlertDialog.stories.tsx:97`

`return element!;` asserts non-null on a value whose type allows `null`/`undefined`; fix the lookup to guarantee the element exists (throw/guard) rather than asserting.

# ERROR cff33b77-132 no-casts `packages/ui/react-ui/src/components/Dialog/AlertDialog.stories.tsx:103`

`document.querySelector<HTMLElement>('[data-scope="dialog"][data-part="backdrop"]')!` non-null-asserts a `querySelector` result that can be `null`; guard explicitly instead.

# ERROR cff33b77-133 no-casts `packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:210`

`return element!;` — same non-null-assertion issue as `AlertDialog.stories.tsx:97`.

# ERROR cff33b77-134 no-casts `packages/ui/react-ui/src/components/Dialog/Dialog.stories.tsx:285`

`return element!;` — same non-null-assertion issue, second occurrence in this file.

# ERROR cff33b77-135 no-casts `packages/ui/react-ui/src/components/Input/Input.stories.tsx:377`

`return element!;` non-null-asserts a lookup result instead of guarding it.

# WARN cff33b77-136 no-trivial-wrappers-over-official-apis `packages/ui/react-ui/src/components/Main/Main.stories.tsx:93`

`const sidebar = () => canvasElement.querySelector<HTMLElement>('[data-side="is"]');` is a play-function-local helper whose body is a single `querySelector` call, used at five assertion sites. Per the rule, inline the call at each site instead of hiding the query behind a name the reader must look up.

# WARN cff33b77-137 no-trivial-wrappers-over-official-apis `packages/ui/react-ui/src/components/Select/Select.stories.tsx:88`

`const picked = () => canvas.getAllByTestId('picked')[0];` is a play-function-local helper whose body is a single `getAllByTestId` call, used only to shorten two `waitFor` assertions. Per the rule, inline `canvas.getAllByTestId('picked')[0]` at each call site instead of hiding the query being made behind a name.

# WARN cff33b77-138 no-trivial-wrappers-over-official-apis `packages/ui/react-ui/src/components/Toast/Toast.stories.tsx:101`

`roots` (`() => [...document.querySelectorAll<HTMLElement>('[data-scope="toast"][data-part="root"]')]`) and, at line 102, `group` (`() => document.querySelector<HTMLElement>('[data-scope="toast"][data-part="group"]')!`) are module-local helpers whose bodies are each a single DOM query, reused across many assertions in this file. Per `no-trivial-wrappers-over-official-apis`, these rename the query rather than removing duplication; inline the `querySelectorAll`/`querySelector` calls at each call site so the selector being exercised stays visible in the assertion.

# ERROR cff33b77-139 no-casts `packages/ui/react-ui/src/components/Toast/Toast.stories.tsx:102`

`document.querySelector<HTMLElement>('[data-scope="toast"][data-part="group"]')!` non-null-asserts a `querySelector` result that can be `null`.

# ERROR cff33b77-140 no-casts `packages/ui/react-ui/src/components/Toast/Toast.stories.tsx:104`

`roots().find((root) => root.textContent!.includes(name))!` stacks two non-null assertions (`textContent!` and the `.find(...)!` result); guard both instead of asserting.

# ERROR cff33b77-141 no-casts `packages/ui/react-ui/src/components/Toast/Toast.stories.tsx:150`

`return element!;` — same non-null-assertion issue as the other stories files in this group.

# ERROR cff33b77-142 no-casts `packages/ui/react-ui/src/components/Tooltip/Tooltip.stories.tsx:100`

`return element!;` — same non-null-assertion issue as the sibling stories files.

# ERROR cff33b77-143 no-casts `packages/ui/react-ui/src/providers/ThemeProvider/icon-registry.ts:75`

`globalThis as unknown as RegistryHost` is the double-cast escape hatch the rule explicitly calls out; instead declare/augment the actual shape expected on `globalThis` (e.g. via a module augmentation) so the cast isn't needed.

# ERROR cff33b77-144 no-casts `packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.tsx:18`

`tx: ThemeFunction<any>;` widens the theme function's generic parameter to `any`, defeating type-checking for every consumer of this context type. Give it a concrete/generic-constrained type instead.

# WARN cff33b77-145 no-trivial-wrappers-over-official-apis `packages/ui/ui-editor/src/extensions/streaming/pending/pending-text.test.ts:140`

`const marked = () => view.contentDOM.hasAttribute('data-pending-text');` is a local helper whose body is a single call, used three times in the same test purely to shorten `view.contentDOM.hasAttribute('data-pending-text')`. Per `no-trivial-wrappers-over-official-apis`, inline the call at each `expect(marked())`/`expect(marked()).to.be...` site instead — the attribute check is what the test is verifying and should stay visible at the assertion.

# WARN cff33b77-146 no-trivial-wrappers-over-official-apis `packages/ui/ui-editor/src/util/cursor.test.ts:21`

`withConverter` (line 21) and `withDefault` (line 22) are describe-local one-line helpers whose bodies are each a single `EditorState.create({...})` call with no branching or error handling — `withConverter` renaming the call at its two use sites (lines 25 and 31) and `withDefault` at its one (line 35). Per the rule, inline `EditorState.create(...)` at each call site so the state construction being exercised is visible where it's used, rather than requiring a jump to the helper's definition.
