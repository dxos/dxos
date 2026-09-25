---
'@dxos/react-ui': minor
---

Add `Collapsible`, a section that folds under its own heading — it pairs the trigger to the section for assistive technology, animates the section's height, and can mount it only while open. A stack of them under one caller-owned expansion set is an accordion, which is how a mail conversation now renders its messages. Dialogs focus the control marked `data-dx-autofocus` on open, so one offering a Cancel action no longer commits on a reflexive Enter, and a dialog body scrolls with its header and actions pinned. Fixes a popover crash on any surface whose theme context carries no safe-area padding, a task list description running under the trailing controls, and an outliner menu button that stayed put when an ancestor scrolled.
