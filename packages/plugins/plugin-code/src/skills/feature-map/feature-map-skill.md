# Feature map

A **feature** is a goal state the product should reach ("Compose & send works against Gmail"). It is a `feat` block in
a spec's `.mdl` text, and it holds:

- a **title** naming it: a noun phrase of two to five words ("Provider sync", not "Syncing mail with providers").
- **prose** stating the ideal: what the feature does when it is complete, in the present tense, in one or two
  sentences. Never write the current state or what is missing; the status, the requirements and the tasks say that.
- **requirements** (`req` entries): what the feature must do, one short, testable sentence each.
- a **status**: `planned`, `prototype`, `operational` or `failing`. Whether anyone works on it is a separate axis, read
  from its linked tasks: an operational feature can be under work too.
- **depends**: the features of the same spec it depends on. A dependency that would close a cycle is a mistake.
- **spec**: the spec that breaks it down, whose features are its subfeatures.

The spec text is the source of truth. Every block has a stable **key**, which links, tasks and comments use; its `F-n`
label is its position and changes when blocks move. A spec a project owns is one of the project's specs, and a spec
that breaks a feature down sits beneath every spec citing it.

**Keep every string short.** A feature map is read at a glance: no preamble, no restating the title, no hedging.

- Read a spec's features with `projects-get-spec-blocks { spec, kind: "feat" }` before changing them. Each block comes
  back with its key, label, title, prose and fields; each requirement with its key.
- Add or change a feature with `projects-set-spec-block { spec, block?, kind: "feat", title?, prose?, fields? }`. Name
  an existing block by key or label to change it; leave `block` out to add one. Fields left out are kept, and a null
  field is removed. Give requirements back with their keys, so comments on them stay anchored.
- Delete a feature with `projects-delete-spec-block { spec, block }`.
- Make a spec with `code-create-spec { name, project? }`. Pass `breaks: { spec, item }` for the spec that breaks that
  feature down; the feature's `spec` field then cites it. Rename a spec, move it to another project or release it
  (`project: null`) with `code-update-spec`.
- **When you pick up a task that moves a feature**, link it with `code-link-task { task, spec, item }` and keep the
  task's status current: a started task is what marks the feature as being worked on.
- **When you plan a milestone from a spec**, file one task per feature it moves, linked to that feature, and one last
  task that checks the milestone's acceptance against what runs. Each task ends with its feature's code running where
  it can be checked, so every task moves a status.
- **Set the status when you observe it**, in the feature's `status` field:
  - `prototype` when its code runs where it can be checked, set by the task that ships it;
  - `operational` when the checks people rely on pass against what runs, normally in the milestone's check task;
  - `failing` when it worked before and does not now.
- **When a feature's requirements change**, check what runs against the changed requirement before touching code. If
  it fails, set `failing` and file one task for the fix, linked to the feature. Stop there unless you were asked to fix
  it too.
- **When you finish work that shows a feature working**, and always when you set one `operational`, make a showcase with
  `code-create-showcase { name, content, targets?, items?, artifacts? }`. A showcase is a slide deck you can present:
  `content` is its first slide, markdown saying where the work runs (its URL), how to reproduce it, and the checks you
  ran as a table of expected against actual. Each of `artifacts`
  becomes a further slide showing that object (uploaded screenshots and videos, diagrams, the PRs the work landed
  in), in the order given. Pass every feature it demonstrates in `items` as `{ spec, item }`, and every task in
  `targets`. An `operational` feature without a showcase is flagged on the map.
