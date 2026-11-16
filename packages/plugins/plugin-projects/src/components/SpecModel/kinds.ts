//
// Copyright 2026 DXOS.org
//

import { type Declaration, DIALECTS, declarationsOf, dialectTexts } from '@dxos/deus/dialect';
import type * as Tag from '@dxos/react-ui/Tag';
import { ACCENT_HUES } from '@dxos/ui-theme';

/** How a block kind is drawn: its icon and the hue of its tag. */
export type KindStyle = { icon: string; hue: Tag.TagHue };

const FALLBACK_STYLE: KindStyle = { icon: 'ph--square--regular', hue: 'neutral' };

/** Nodes that are no dialect's blocks: a code symbol, or another spec whose text is not at hand. */
const EXTERNAL_STYLE: Record<string, KindStyle> = {
  code: { icon: 'ph--file-code--regular', hue: 'amber' },
  spec: { icon: 'ph--file-text--regular', hue: 'violet' },
};

const isHue = (value: string | undefined): value is Tag.TagHue =>
  value === 'neutral' || ACCENT_HUES.some((hue) => hue === value);

/** The icon and hue a kind's declaration gives it; an unknown hue is neutral. */
export const styleOf = (declaration?: Declaration): KindStyle => {
  const hue = declaration?.hue;
  return { icon: declaration?.icon ?? FALLBACK_STYLE.icon, hue: isHue(hue) ? hue : FALLBACK_STYLE.hue };
};

const DIALECT_DECLARATIONS = declarationsOf(dialectTexts([...DIALECTS.keys()]));

/** A kind's style as the bundled dialects declare it, for drawing a kind with no spec at hand. */
export const kindStyle = (kind: string): KindStyle => EXTERNAL_STYLE[kind] ?? styleOf(DIALECT_DECLARATIONS.get(kind));

/** The independently toggled groups of a definition graph: what the code is made of, what it must do, and how it is checked. */
export type KindGroup = 'concepts' | 'requirements' | 'qa';

export const KIND_GROUPS: readonly KindGroup[] = ['concepts', 'requirements', 'qa'];

const GROUP_OF: Record<string, KindGroup> = {
  feat: 'requirements',
  req: 'requirements',
  scenario: 'qa',
  test: 'qa',
  suite: 'qa',
};

/** A kind's group; anything not a requirement or a check is a concept, so a new block kind shows with the code. */
export const groupOf = (kind: string): KindGroup => GROUP_OF[kind] ?? 'concepts';

/** The kinds to leave out of a graph, given which groups are shown. */
export const hiddenKinds = (kinds: Iterable<string>, shown: Record<KindGroup, boolean>): string[] =>
  [...kinds].filter((kind) => !shown[groupOf(kind)]);
