---
'@dxos/react-ui': minor
'@dxos/plugin-support': patch
---

`Carousel`, `Editable`, `Splitter` and `Stepper` are now built on `@ark-ui/react`'s zag state machines rather than hand-written interaction and a11y logic. The namespaced APIs (`Carousel.Root`, `Editable.Preview`, `Splitter.Panel`, …) and their props are unchanged apart from the two noted below, and every part still takes `classNames`.

Breaking: `Carousel.Root` no longer takes `transition` — the machine has one way to move between slides, so a carousel that previously hard-swapped now slides — and `useCarousel` is removed. `Editable`'s `useEditableContext` is now the machine's own context hook and takes no consumer name; `useEditable` keeps its options and return shape, with `onBlur` dropped (an interaction outside the field is the machine's to handle) and `activation` widened to also accept `'focus'` and `'none'`.

`Escape` on an `Editable` that was empty when it opened now discards the typed text rather than keeping it, and a field held open through `editing` commits at all — a controlled editing state made the machine treat a submit as a request to its host, so a pane editor driven that way wrote nothing.

`Stepper` no longer eases its progress line back to nothing when a run is reset or wound back; only the line leaving the stage in flight animates, and everything else lands at once. A run that fails now draws every stage it started in the error hue rather than only the stage it stopped on.

An article surface is told which graph node it renders (`nodeId`), separate from which node holds attention (`attendableId`). The two are the same for a primary plank and differ for a companion, which shares its host's attention — so a surface reading its own contributed actions from `attendableId` was rendering the host's toolbar. Actions can also say which surface they suit: `disposition` already accepted an array, and `'prompt'` joins `'toolbar'` for actions that belong beside a text input rather than on an object.

An editor's placeholder no longer shows behind streamed pending text, which is a decoration rather than document content.
