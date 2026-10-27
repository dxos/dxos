# Community support

An open-source project's community Discord, synced into the space: people ask how to get started, report a
bug, ask for a feature or share a link, and say hello. The team keeps a Community project whose routine
triages each new message: a question becomes a "Reply to" task carrying a drafted reply for a person to
review, and the work a message asks for becomes a task.

- Code: this directory: `channel.ts`, `project.ts`, `triage-script.ts`, `CommunitySpace.ts`, tested by
  `CommunitySpace.test.ts`
- Requires: none
- Optional: none
- Provides: `channel`, `project`
- Clock: messages run from −20d to −1d.
- Used by: the Community support template (`CommunitySpace.ts`)

## Contents

### Channel

- 1 `Channel.Channel` `general`, named "#general", feed-backed.
- 8 `Message`s in its feed, one per member, all fictional, oldest first:
  - `maya` asks for short videos on building a first plugin.
  - `ivo` asks for a guide to customizing storage.
  - `sana` reports that a renamed space keeps its old name in the sidebar until a reload.
  - `theo` asks to pin a channel to the top of the navigation tree.
  - `lena` shares a write-up on CRDT benchmarks.
  - `kofi`, `ana` and `jun` say hello.

### Project

- 1 `Project.Project` `community`, "Community", `active`, with an empty `TaskSet` and an `Outline`.
- 1 `Routine` "Triage #general" on the project, `kind: runnable`, running `TriageMessages`.
- Its 1 `Trigger` is a feed trigger on the channel's feed, disabled, `concurrency: 1`, with input
  `{ project, feed }`.

## Flows

1. Create a space from the Community support template: the navigation tree shows "#general" and "Community".
2. Open "#general": the 8 messages show, oldest first.
3. Open "Community" on its Tasks tab, then run "Triage #general" from the project's Routines: with the scripted
   model (`?model=scripted`), the project gains 3 "Reply to" tasks and 6 work tasks, and the greetings file
   nothing.

## Checks

- 1 `Channel`, 8 `Message`s in its feed, 1 `Project`, 1 `Routine`, 1 `Trigger`.
- The trigger is disabled, watches the channel's feed and binds `TriageMessages`.
- Every message's text matches exactly one script entry or none, and the script files 3 replies and 6 tasks.
