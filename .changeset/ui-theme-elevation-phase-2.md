---
'@dxos/react-ui': minor
---

Rework the surface system around six named elevation levels (`sunken`, `chrome`, `base`, `raised`,
`overlay`, `popup`). Chrome now sits below the document canvas and cards above it, so panels read as
raised rather than recessed. Toolbars, groups and inputs are no longer fixed levels: they derive
from whichever surface hosts them, so a toolbar in a card and a toolbar on the canvas each read
correctly. Enter a surface with `data-surface="<level>"` or the matching `dx-*-surface` class; a bare
`bg-*-surface` utility paints the colour without publishing the surface, so states inside it will not
derive. Fixes `selected-surface` silently tracking the root surface instead of its own zone, and the
app canvas not painting a surface at all.
