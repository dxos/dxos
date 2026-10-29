# Repo-wide review rules

The `rule` blocks the [`agentic-review`](../skills/agentic-review/SKILL.md) skill applies across
the whole repo. They live outside the skill folder because the skill is shared: other repos install
it with `npx skills`, which replaces the whole folder on update, and each repo keeps its own rules.
Package-specific rules stay colocated in that package's `.mdl` files.
