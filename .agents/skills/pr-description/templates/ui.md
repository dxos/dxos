# UI

Applies when anything a user sees changes.

```markdown
## UI

### Screenshots

<For a static change (styling, layout, a new component in its resting states): before/after
screenshots from the same build, with the measurements that matter beside them (box sizes, spacing,
computed style). Label each image.>

| Before         | After         |
| -------------- | ------------- |
| ![before](url) | ![after](url) |

### Demo

<For behaviour that does not fit in still frames (a flow, an animation, drag and drop, anything
across several steps): an Autocue recording of the feature end to end, with one line on what it
shows and which flow or `.mdl` test it ran.>

[demo.webm](url)
```

- Use screenshots when every state can be shown in a still; use a video when the point is the
  transition or the sequence. A new feature with both a new look and a new flow gets both.
- Screenshots: follow "Before/after screenshots" in the `composer-ui` skill (capture both states from
  one build, measure, don't just look).
- Videos: the `autocue` skill records them; `hosting-artifacts` publishes them — `gh --attach` first,
  so the video plays inline, R2 only as the fallback.
- If the change is visible only behind a flag or in a specific space setup, say how to reach it.
