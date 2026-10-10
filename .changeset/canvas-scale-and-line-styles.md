---
'@dxos/react-ui-canvas': minor
---

Links take a line style (a hue from the style grid's outline row, and solid, dashed or dotted), and their ends, arrow, triangle and circle, are a quarter of a major grid cell drawn in the line's hue; links scale with the zoom. Breaking: `Link.directed` is removed in favour of `ends: { end: 'arrow' }` (plugin-canvas reads saved `directed` links as an end arrow). Tones 1 to 3 run strongest to lightest (the hue's 500, 400 and 300), the style grid offers sky in place of pink, node frames have a 2px border and labels default to 18px. New shapes are sized in major grid cells (a rectangle 2×1, an ellipse 2×2) and a node made by dropping a link is centred on the release point, selected with its link. The properties panel gains a toolbar with a flip-direction button for links and shows a scene shape's resolved Show contents; Fit leaves two major cells of margin, the navigation bar's Up and root are icons, and the depth label is gone.
