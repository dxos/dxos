---
'@dxos/plugin-debug': patch
'@dxos/react-ui-slides': patch
---

The DXOS Deck's diagrams keep their card styles in a production build, so the cards draw with their panel, type size and spacing in the deployed app as they do on a dev server. Bold text in a slide takes the subheading color at the body's weight, so color alone marks it; the title of a flow card is unchanged.
