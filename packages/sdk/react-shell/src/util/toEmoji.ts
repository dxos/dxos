//
// Copyright 2023 DXOS.org
//

import toArray from 'lodash.toarray';

const emoji = toArray(
  // When changing this set, please check the result in a console or e.g. RunKit (https://runkit.com/thure/642214441dd6ae000855a8de)
  // Emoji sometimes use a combination of code points, and some code points aren't visible on their own, so by adding or deleting you may unintentionally create non-visible items.
  // This set was chosen from the characters in Unicode Emoji v15.0 based on the following criteria:
  // – not people or isolated anthropomorphic faces
  // – not flags
  // – more concrete than abstract
  // – less culturally specific
  // – less easily confused with another emoji in the set
  // – requires less special knowledge to identify
  // – less likely to evoke negative feelings (no meat, no drugs, no weapons, etc)
  // – less common as a signifier in UX
  '👹👻👽🤖🎃🦾🦿🦷👣👁️🧶👑🐒🦆🦉🐴🦄🐝🦋🐞🪲🐢🦎🦕🦑🦀🐠🐬🐋🦭🐅🐆🦓🦍🦧🐘🐫🦒🦘🦬🐖🐏🦌🐕🐈🐓🦚🦜🦢🦩🦦🐁🐿️🌵🌲🌳🪵🌱🍁🪺🍄🐚🪸🪨🌾🌷🌻☀️🌙🪐⭐️⚡️☄️🔥🌈☁️💧⛱️🌊🍎🍋🍉🍇🫐🍈🍒🍑🥭🍍🥥🥝🥑🌶️🌽🥕🍬🥜🫖☕️🍵🧊🧂🏔️⚓️🛟🏝️🛶🚀🛰️⛲️🏰🚲⛺️🎙️🧲⚙️🔩🔮🔭🔬🧬🌡️🧺🛎️🔑🪑🧸🎈🎀🎊♻️🎵',
);

export const toEmoji = (keyAsHex: string) => emoji[parseInt(keyAsHex, 16) % emoji.length];
