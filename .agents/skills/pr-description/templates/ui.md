# UI

Applies when anything a user sees changes. Copy this block verbatim and replace every `{{…}}` slot.

```markdown
## UI

**How to reach it:** {{HOW_TO_REACH}}

### Screenshots

| Before                    | After                   |
| ------------------------- | ----------------------- |
| ![before]({{BEFORE_URL}}) | ![after]({{AFTER_URL}}) |

{{MEASUREMENTS}}

### Demo

{{VIDEO_URL}}

{{DURATION}}, {{WHAT_IT_SHOWS}}
```

The video URL stands alone in its paragraph, with no link text and nothing else on the line. GitHub
turns a `user-attachments` URL into an inline player only in that position; inside a sentence or a
`[name](url)` link next to other text it renders as a plain link.

| Slot                | Fill with                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `{{HOW_TO_REACH}}`  | The path to the change in the app: `Settings › Plugins › Foo`, `open any Markdown document`, or the flag / space setup it needs.    |
| `{{BEFORE_URL}}`    | Screenshot of the base build. For a brand-new component with no before, write `—` in the Before cell instead of an image.           |
| `{{AFTER_URL}}`     | Screenshot of the head build, same viewport and state. Add one table row per further state (hover, empty, error).                   |
| `{{MEASUREMENTS}}`  | The measurements that matter, one bullet each (`- Card height: 72px → 64px`). Write `No measured differences.` when there are none. |
| `{{VIDEO_URL}}`     | The bare `https://github.com/user-attachments/assets/<uuid>` URL that `gh --attach` minted; the R2 URL only as the fallback.        |
| `{{DURATION}}`      | Length of the recording: `47 s`, `1 min 20 s`.                                                                                      |
| `{{WHAT_IT_SHOWS}}` | What the recording shows and which flow or `.mdl` test it ran.                                                                      |

## Which subsections

- A static change (styling, layout, a component in its resting states) keeps **Screenshots** and
  replaces the Demo URL and caption with the single line `None — static change.`
- Behaviour that does not fit in still frames (a flow, an animation, drag and drop) keeps **Demo**
  and replaces the table and measurements with `None — see demo.`
- A new feature with both a new look and a new flow fills both.

## Producing the images

- Screenshots: follow "Before/after screenshots" in the `composer-ui` skill (capture both states from
  one build, measure, don't just look).
- Videos: the `autocue` skill records them; `hosting-artifacts` publishes them — `gh --attach` first,
  so the video plays inline, R2 only as the fallback.
