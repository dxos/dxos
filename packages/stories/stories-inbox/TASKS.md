# stories-inbox — Tasks

_Resume: Open MailboxSync/CronSync in Storybook after connecting Gmail. Uncommitted: all new files. Last: Cron sync story + Triggers module._

## Phase: MailboxSync cron trigger story

Story variant that wires Gmail sync to an hourly cron trigger and adds a Triggers module for inspecting and manually invoking triggers via `TriggerDispatcher.invokeTrigger`.

### Tasks

- [x] **TriggersModule** — list space triggers, dispatcher status, invoke-now for cron triggers.
- [x] **CronSync story** — add `RoutinePlugin`, extend types, new layout with `Module.Triggers`.
- [x] **Triggers from integration only** — dropped the manual "Create trigger" button and the
      `SyncTriggerRunner`; triggers are now created solely by the connector sync integration.
- [x] **Verify** — `moon run stories-inbox:compile` passes.
