//
// Copyright 2026 DXOS.org
//

import type * as Tag from '@dxos/react-ui/Tag';

import { FEATURE_STATUS_STYLE } from '../FeatureCard/index.ts';

/** How a card draws one value of a fact field. */
export type FactStyle = { icon: string; hue: Tag.TagHue };

/**
 * The fields a card shows beside its kind, each with a style per known value; a value with no style is shown plain.
 * A block shows a field only when it writes one.
 */
export type DefinitionFacts = Readonly<Record<string, Readonly<Record<string, FactStyle>>>>;

/** A feature's status as the feature map draws it; any other block's `status` (a test's `passing`) plain. */
export const DEFAULT_FACTS: DefinitionFacts = { status: FEATURE_STATUS_STYLE };

/** A fact on a card: the field, its value as written, and its style when the value is a known one. */
export type CardFact = { field: string; value: string; style?: FactStyle };
