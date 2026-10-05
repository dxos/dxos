---
'@dxos/react-ui-editor': patch
---

Text editors mount faster: `useTextEditor` builds the CodeMirror view detached and attaches it once built, so the view's initial classes and attributes are set before it is in the page rather than each one invalidating style against the whole stylesheet.
