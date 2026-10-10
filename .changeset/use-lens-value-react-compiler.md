---
'@dxos/echo-panproto': patch
---

`useLensValue` re-reads its projection when the object changes inside components built with the React Compiler, which had cached it on the unchanged object and lens. Pipeline columns rebuild their query only when the view's query changes.
