# MarkdownEditable — mount cost and the empty frame

`MarkdownEditable` held open (`editing`) is a CodeMirror editor, and an editor fills its box only
once its `EditorView` exists. Where that construction happens decides whether a reader sees the box
empty first.

## The empty frame

`TaskList.Edit` keys the field on the task it edits, so selecting another task unmounts and remounts
it. With the view built in a passive effect — after the browser paints — the sequence for one
selection change was:

| event                   | description box | `.cm-editor` |  pane |
| ----------------------- | --------------: | ------------ | ----: |
| before the click        |            24px | yes          |  90px |
| React commit            |         **0px** | **no**       | 190px |
| view constructed, +30ms |            48px | yes          | 238px |

The middle row is a painted frame: the title and the task's history are on screen while the
description occupies nothing, and 30ms later everything below the field drops by its height. In the
project's task companion this read as the history rendering before the description.

Building the view in a **layout effect** (`useLayoutEffect` in `useTextEditor`) removes it — the
same switch now lands in one mutation batch:

| event            | description box | `.cm-editor` |  pane |
| ---------------- | --------------: | ------------ | ----: |
| before the click |            24px | yes          |  90px |
| React commit     |            48px | yes          | 238px |

## What that costs

The work does not disappear; it moves into the commit, before paint. Measured on a ~3.2k-character
markdown document (`ui/react-ui-editor/Folding`), mounting produced **no `longtask` entry** — no
task over 50ms — and the story's `domContentLoaded` stayed at ~245ms. Not measured: a document of
100k characters or more, which is the case worth watching, since a slow enough construction would
now lengthen the frame rather than arriving a frame late.

To measure it, mount the editor with the document in question and read the longest task:

```js
new PerformanceObserver((list) => console.log(list.getEntries().map((e) => e.duration))).observe({
  entryTypes: ['longtask'],
});
```

A construction that shows up as a long task is the signal to stop paying it in the commit — see
below.

## If the commit ever gets too long

The fix that removes the work rather than moving it is to stop remounting: keep one `EditorView` and
swap its document when the subject changes. That is not free either — the remount is currently what
resets the undo history, fires the blur that commits pending text, and places the cursor, so a swap
has to do each of those explicitly. `MarkdownEditable` has one consumer (`TaskList.Edit`), so the
change is contained, but it changes what "a field held open" means and wants tests for:

1. text typed in task A, then a switch to B without blurring — A keeps it, B does not show it;
2. undo in B cannot produce A's text;
3. switching to a task with no description empties the field.
