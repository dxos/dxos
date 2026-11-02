# Feature map

A **feature** is a goal state the product should reach ("Compose & send works against Gmail"). It holds:

- a **description** of the ideal: what the feature does when it is complete and why it matters, in the present
  tense. Never write the current state or what is missing there; that is what the status, the requirements and
  the tasks say.
- **requirements**: what the feature must do, one testable statement each. A reader should understand the feature
  from its description and requirements alone, without opening a spec.
- a **status** saying how far it has come: `planned`, `prototype`, `operational` or `failing`. Whether anyone is
  working on it is a separate axis, read from its linked tasks: an operational feature can be under work too.

Features live on **specs**. A spec is a map of the features one product area should reach; every feature is on
exactly one spec's map. Features **nest** through specs: a feature may own one spec of its own that breaks it down,
and the features on that spec are its **subfeatures**, each a feature in its own right with its own description,
requirements, status, dependencies and tasks. A reader zooms into a feature to see its subfeatures. A top-level spec
may be owned by the **project** whose tasks deliver it. Every spec holds the normative `.mdl` document its features
come from. A project has at most one spec: giving a spec to a project that already has one is refused, and the error names
that spec. A breakdown spec belongs to its feature, so no project can own it; its work is tracked in the project of
the spec above it.
A dependency may cross specs: a feature can need a feature on another spec's map.

**Keep every string short.** A feature map is read at a glance, so write the fewest words that say it:

- a feature **name** is a noun phrase of two to five words ("Provider sync", not "Syncing mail with providers");
- a **description** is one sentence, two at most;
- a **requirement** is one short, testable sentence; split a long one rather than chaining clauses;
- no preamble, no restating the name, no hedging, no lists of examples.

**Specs are the unstructured source; features add the structure.** A spec's `feat` blocks and their `req` lines
become features and requirements: extract them rather than linking to the spec.

- Read a spec's features with `code-get-features { spec }` before changing them: it returns every feature on
  the map and on the specs nested beneath it, with its description, status, requirements, spec, parent,
  dependencies, linked tasks and showcases.
- Make a spec with `code-create-spec { name, project?, feature? }`; pass `feature` for the spec that breaks that
  feature down. Rename it, move it to another project, or release it (`project: null`) with `code-update-spec`.
- Extract features from a spec document with
  `code-import-spec-features { path, text, spec? | feature? | name?, project? }`: pass the repo path and the
  text. The text becomes the spec's document, and each `feat` block becomes a feature (its prose the description,
  its `req` lines the requirements) on the spec given, on the spec breaking `feature` down, or on a new spec.
  Importing the same path again updates that spec and the features it made before from the file. Afterwards,
  rewrite any description that states the current state rather than the ideal, and move features onto a parent's
  spec where one is a part of another.
- A spec's document embeds its features rather than spelling them out: the embeds say which features the spec holds
  and in what order, and each feature holds its own text. Read a spec as text with
  `code-export-spec-features { spec }`, which writes each embed out as its `feat` block. Moving an embed reorders
  the spec and deleting one deletes its feature, but its id must be kept as it is; change what a feature says through
  the feature operations.
- Create a feature with `code-create-feature { name, description, requirements, spec? | parent? }`.
  Change one with `code-update-feature`; `requirements` replaces the whole list, and `spec` moves it onto that
  spec's map. `code-delete-feature` deletes a feature with its breakdown. Record that one feature needs another with
  `code-add-feature-dependency { feature, dependsOn }` — a dependency that would close a cycle is refused, and
  the error names the cycle. `code-remove-feature-dependency` undoes one.
- **When you pick up a task that moves a feature**, link it with `code-link-feature-task { task, feature }`
  and keep the task's status current: a started task is what marks the feature as being worked on.
- **Set the status when you observe it**, with `code-update-feature { feature, status }`: `prototype` when it
  works in a demo, `operational` when people can rely on it, and `failing` when it worked before and does not now.
- **When you finish work that shows a feature working**, make a showcase with
  `code-create-showcase { name, content, targets, artifacts? }`. A showcase is a slide deck you can present:
  `content` is its first slide, markdown saying what you showed and how to reproduce it, and each of `artifacts`
  becomes a further slide showing that object — the screenshots and videos you uploaded as files, diagrams, the PRs
  the work landed in — in the order given. Pass every feature and task it demonstrates in `targets`. An
  `operational` feature without a showcase is flagged on the map.
