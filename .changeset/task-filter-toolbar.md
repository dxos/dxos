---
'@dxos/plugin-tasks': minor
---

Task lists filter from a query editor in their toolbar, as a mailbox does: free text matches a task's title and description, `#tag` matches its tags, and typed terms like `status:started` match its own fields. The filter row renders in the standalone `TaskSetArticle` and in the section a project's Tasks tab embeds, which previously had no filter. Ancestors of a match are kept, so filtering never restructures the sub-task tree.
