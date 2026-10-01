---
'@dxos/react-ui': minor
---

Next foundations: Container `span` (also on `Field.Root` and `Fieldset.Root`), with every cell of a `row`
Container naming its own edge lines; an exported `ControlFrame` under Input's adornments; `Next.Empty` and
`Next.Banner`; Fieldset renders a `div` group whose `disabled` reaches its controls through context;
`Input variant='mono'`; `Image backdrop='dominant'`, its sampler now `sampleDominantColor` in `@dxos/lit-ui`.
Props for common className patterns: Container/Panel `width='document'`, Typography `lines`/`mono`/`tone`,
Icon `tone`/`spin`/`size`, Button `align`/`spin`/`iconSize`, `Toolbar.Separator variant='gap'`, `Menu.TriggerItem
disabled`, a Switch in a toolbar's roving focus, and `useVirtualAnchor`. List chrome strings (`drag-handle.label`,
`remove.label`, `empty.label`) are react-ui translations.
