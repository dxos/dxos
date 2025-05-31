//
// Copyright 2024 DXOS.org
//

import type { AliasLayer, ResolvedHelicalArcSeries, HelicalArcValue, SemanticLayer } from '@ch-ui/tokens';

export type PhysicalPalette = Omit<ResolvedHelicalArcSeries, 'extends' | 'physicalValueRelation'>;
export type ColorSememes = SemanticLayer<string, string, HelicalArcValue>['sememes'];
export type ColorAliases = AliasLayer<string>['aliases'];
