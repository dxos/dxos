---
branch: claude/serene-bohr-ryk6n9
commit: a733eb18eb80d4727006579aa2e79c6a8a419e5c
base: 7602b022059ee234a0422dc91ba16b23c03408a9
mode: fast
createdAt: 2026-09-27T08:09:33.518Z
isFinalized: true
groups: 71
rules: [extract-non-rendering-logic-from-component, no-styling-wrapper-divs]
reviewId: a733eb18
---

_0 error(s), 2 warning(s)._

# WARN a733eb18-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 122-133 (`const [missing, setMissing] = useState(false);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN a733eb18-2 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:338`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 338-349 (`if (mode === 'section') {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.
