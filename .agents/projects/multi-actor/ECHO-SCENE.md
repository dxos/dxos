# ECHO design scene — construction plan

Sixteen actors build the **ECHO design** document of the DXOS Architecture template, from its outline to the
finished text, while others build its diagrams and sheet, comment, and use the assistant. The finished state is the
template's own document, so the scene is checked against it and stays repeatable as the document changes.

## Target

The template seeds the target (`plugin-canvas/src/samples/architecture/`, spec `CONTENT.md`):

| Object                                 | Source                                                                          | Used in chapter |
| -------------------------------------- | ------------------------------------------------------------------------------- | --------------- |
| **ECHO design** (Markdown)             | `echo-design.md`, built by `echo-design.ts`                                     | all eight       |
| **ECHO data model** (canvas)           | `docs/diagrams/echo-model.dx`                                                   | 2. Data model   |
| **ECHO replication** (canvas)          | `docs/diagrams/echo-sync.dx`; its AutomergeHost box drills into `composer-echo` | 4. Replication  |
| **ECHO queries** (canvas)              | `docs/diagrams/echo-query.dx`                                                   | 5. Queries      |
| **ECHO benchmarks** (sheet, bar chart) | `ECHO_BENCHMARKS` in `echo-design.ts`                                           | 7. Performance  |

## Start state: the outline

Derived from the target, not written by hand, so editing the document updates the scene:

- **Document:** the title, the intro paragraph, every `## N. Chapter` heading, and every embed line. Chapter bodies are empty.
- **Canvases:** the three drawings with their group frames only. Nodes and arrows are removed.
- **Sheet:** the header row only, with the chart already defined so it fills in as rows arrive.

`outline(target)` produces this state; `steps(target)` produces the actors' work below. A test asserts that playing
the steps on the outline reproduces the target: the same document text with embed ids normalised, the same canvas
records, and the same cells.

## Actors

The actors are laid out as a 4x4 wall, row-major. Every actor works in their own copy of the app, as a separate identity. A writer's
view scrolls so that their chapter heading sits at the top.

| #   | Actor | Surface                   | Work                                                                                |
| --- | ----- | ------------------------- | ----------------------------------------------------------------------------------- |
| 0   | Ada   | Document                  | Writes 1. Goals                                                                     |
| 1   | Ben   | Document                  | Writes 2. Data model                                                                |
| 2   | Cleo  | Canvas: ECHO data model   | Adds its boxes and arrows, one at a time                                            |
| 3   | Dev   | Document                  | Writes 3. Schema                                                                    |
| 4   | Eve   | Document                  | Writes 4. Replication                                                               |
| 5   | Finn  | Canvas: ECHO replication  | Adds its boxes and arrows                                                           |
| 6   | Gia   | Document                  | Writes 5. Queries                                                                   |
| 7   | Hugo  | Canvas: ECHO queries      | Adds its boxes and arrows                                                           |
| 8   | Iris  | Document                  | Writes 6. Spaces and security                                                       |
| 9   | Jon   | Document                  | Writes 7. Performance. Jon is at column 2, row 3, where a Grid zoom-out opens.      |
| 10  | Kai   | Sheet: ECHO benchmarks    | Types the ten benchmark rows; the chart grows                                       |
| 11  | Lena  | Document                  | Writes 8. Roadmap                                                                   |
| 12  | Milo  | Document + comments       | Comments on phrases in chapters 2 and 4, and on the replication canvas as a whole   |
| 13  | Nia   | Sheet + comments          | Comments on the cold full-text row, which misses its target, as a cell-range thread |
| 14  | Omar  | Assistant chat            | Asks the assistant for roadmap ideas; Lena's text follows from the reply            |
| 15  | Pia   | Assistant chat + document | Asks the assistant to tighten chapter 6, then makes those edits in the document     |

The writers whose chapters draw comments answer them once their chapter is done. Ben and Eve answer Milo; Jon
answers Nia.

## Timeline (about 60s)

| Time        | What happens                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| 0–2s        | The outline is on screen; every actor has joined the space.                                                               |
| 1–20s       | Writers start one after another, a few seconds apart, and pause between sentences, so their typing overlaps only in part. |
| 3–25s       | The canvas builders add a box every second or so, then the arrows between boxes.                                          |
| 10–30s      | Kai fills the sheet row by row.                                                                                           |
| 15s and 32s | Omar's and Pia's prompts. The scripted replies stream for 4–6s.                                                           |
| 25–45s      | Milo and Nia comment.                                                                                                     |
| 40–55s      | Writers answer the comments on their chapters; Pia applies the assistant's edits.                                         |
| 55–60s      | Hold on the finished document.                                                                                            |

## What the harness needs

1. **Surfaces per actor.** `ActorArticle` takes a surface (`document`, `canvas`, `sheet`, `chat`) and a subject
   from the scene, in place of the markdown-only article it has now.
2. **Canvas binding.** Invokes `CanvasOperation.Apply` with `create` intents (boxes) and `link` intents (arrows),
   taken from the target canvas records in build order.
3. **Sheet binding.** Calls `SheetOperation.SetValues`, typed one cell at a time. The grid's focus moves to the cell
   (`SheetCapabilities.GridInstances`), standing in for the cursor, since the sheet has no remote presence.
4. **Chat binding.** One chat per assistant actor. `AssistantPlugin({ aiServiceMiddleware })` uses
   `ScriptedLanguageModel` with the replies split into parts so they stream. The actor types its prompt into the chat
   prompt's editor.
5. **Comments.** Text anchors as now. Object-level threads on the canvas (no anchor). A cell-range anchor
   (`"col,row,col,row"`) on the sheet.
6. **Scroll.** `actor.scrollTo(heading)` puts the chapter heading at the top of the view, and again whenever another
   chapter grows above it.
7. **Recording.** As for the Team scene: one stepped render at 7680x4320, cut into 16 clips, then the Grid zooms out
   from Jon.

## Checks

- Playing the steps on the outline reproduces the target document, canvases and sheet.
- Every actor converges on the same text and the same comment threads.
- The story test steps the scene to its end in under the storybook timeout.
