# @dxos/react-ui-task — Tasks

## Phase 1: Cleanup

The package's components each sit in their own folder (`TaskList`, `TaskProperties`, `TaskHistory`,
`TaskQuestion`), with shared helpers in `util/` and `hooks/`. What remains is simplifying the editor
and moving hand-rolled layout onto the layout primitives.

### Tasks

- [x] **Move `TaskProperties` and `TaskHistory` out of `TaskList/`** — peers of `TaskList`; `status-icons`,
      `assignee` and `useAssigneeDisplay` moved to `util/` and `hooks/`.
- [ ] **Simplify `TaskListEditor.tsx`**
  - `src/components/TaskList/TaskListEditor.tsx` (~530 lines): one grid serving both the create and edit
    cases, the `grid` (row-aligned) and inset layouts, file drops and controls.
  - Candidates: build the fields on `react-ui-form` over the `Task` schema, as `TaskArticle` does; drop
    branches the remaining callers (`TaskSetArticle`, `plugin-assistant` `Chat.tsx`) do not need.
- [ ] **Standardize on `Flex` and `Grid` in place of styling `div`s**
  - Hand-rolled `<div className='flex …'>` / `'grid …'` across `TaskList.tsx`, `TaskHistory.tsx`,
    `TaskList.stories.tsx`, and `plugin-tasks` `TaskArticle.tsx` (the agentic review's
    `no-styling-wrapper-divs` findings in `.agents/reviews/467f7f13211/REVIEW.md`).
