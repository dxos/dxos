---
'@dxos/react-ui-canvas': patch
'@dxos/plugin-presenter': minor
---

A 2D canvas shown as a section, slide or card leaves the wheel and trackpad to the page until it has focus. A canvas exported or printed as SVG draws a container's label at its top-left corner rather than its centre.

In a presented deck, left, right, `[` and `]` move between slides past any click steps, with the brackets landing on a slide fully built, up and down step through a slide's click steps, and Cmd or Ctrl with left or right jumps to the first or last slide. Up and down no longer jump to the deck's ends. In a Presentation's thumbnail grid, up and down move between rows and Space starts presenting from the current slide.

Choosing a template in the Create Space dialog no longer scrolls the list, so the press lands on the row under the pointer. The chosen template keeps an orange outline, hover is easier to see, and the dialog's scrollbar sits at its edge. `Listbox.Root` gains `selectionStyle='outline'`.

Theme settings gain a hue picker for the focus color.

A `Card.Header`'s Block and icon-only Button stay beside the first line of a wrapping Title. The space Home scrollbar sits at the right edge of the plank.
