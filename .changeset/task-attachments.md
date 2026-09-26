---
'@dxos/types': minor
'@dxos/plugin-tasks': minor
'@dxos/plugin-space': minor
'@dxos/app-toolkit': minor
'@dxos/plugin-file': patch
'@dxos/react-ui-task': patch
'@dxos/ui-theme': patch
---

Add `Task.attachments`, files a task owns, with `Task.addAttachment`/`Task.removeAttachment` recording each change in the task's history, and the `tasks.addAttachment`/`tasks.removeAttachment` operations. Where plugin-file is installed, files dropped or pasted onto a task's article are stored and attached, with a placeholder card while each uploads and "Remove attachment" in the card's menu.

`CardMasonry` (plugin-space) is now exported from `@dxos/plugin-space/components`, and `AppSurface.CardMasonryData` gains `size: 'compact'` (cards at three quarters, so a companion fits two columns), `inline` (in the host's flow rather than its own scroller), `pending` placeholder cards, and `CardMenu`, through which a host adds items to each card's menu. The `cardMasonry` surface now activates when requested on its own. A task's attachments and artifacts render through it.

Image file cards fill the card; agent assignees use a robot glyph; tags centre their content.
