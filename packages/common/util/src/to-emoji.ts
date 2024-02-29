//
// Copyright 2023 DXOS.org
//

import { type PublicKey } from '@dxos/keys';

export const idEmoji = Array.from(
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
).filter((char) => !!char);

export const stringToEmoji = (string: string) => toEmoji(parseInt(btoa(string.substring(0, 16)), 16));

export const keyToEmoji = (key: PublicKey) => idEmoji[key.getInsecureHash(idEmoji.length)];

export const toEmoji = (hash: number) => idEmoji[hash % idEmoji.length];
