# Task Plan

## Goal

Debug why pragmatic drag-and-drop shows tree drop indicators on web but not in the Tauri app, using runtime evidence before making any fix.

## Phases

| Phase                               | Status      | Notes                                                                                                             |
| ----------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| Establish context and logging setup | complete    | Loaded rules, identified shared tree DnD path, confirmed debug log configuration.                                 |
| Instrument hypotheses               | complete    | Added logs for registration context, drag start, canDrop, instruction computation, and instruction-state changes. |
| Reproduce and analyze logs          | complete    | Runtime evidence showed native dragstart in Tauri with empty `dataTransfer` and no follow-up hover events.        |
| Implement proven fix                | in_progress | Seed standard native drag data for shared tree draggables in native runtime, then verify with logs.               |
| Verify and clean up                 | pending     | Re-run with logs, then remove instrumentation after confirmation.                                                 |

## Errors Encountered

| Error                                                                   | Attempt | Resolution                                                |
| ----------------------------------------------------------------------- | ------- | --------------------------------------------------------- |
| `session-catchup.py` not found at the default path from the skill docs. | 1       | Proceed with a fresh planning session in repo-root files. |
