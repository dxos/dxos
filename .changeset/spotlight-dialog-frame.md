---
# multiple-changesets: the mobile layout split and the Quick Access panel frame are unrelated;
# a reader chasing either would look it up on its own package.
'@dxos/plugin-spotlight': patch
---

Remove the duplicate frame around the Quick Access panel: the dialog inside it no longer draws its own border, corner radius and shadow on top of the native panel frame.
