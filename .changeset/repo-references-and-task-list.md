---
'@dxos/types': minor
'@dxos/plugin-github': minor
---

Add a `Repo` type (a host-agnostic source repository, with provenance carried by foreign keys) and `Project.repo` naming the repository a project's work lands in. `#123` in markdown now decorates as a link to the issue or pull request, contributed by `@dxos/plugin-github` and resolved against the owning project's repository, then the repository its task set mirrors, then the single repository a space mirrors; a space with none or several leaves the text alone. The outline accepts host-contributed editor extensions so a plugin's decoration can reach it, and `hashtag()` no longer claims a bare number.

The task list renders a task's description as markdown on its own row, marks the selected row, keeps its create row on screen, and reveals the delete affordance on hover or keyboard focus only. `Popover.Arrow` renders again: the popover content clipped its own overflow, and Radix positions the arrow as a child of that content straddling its edge, so clipping moved to `Popover.Viewport`.
