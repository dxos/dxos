//
// Copyright 2024 DXOS.org
//

import type { HelicalArcSeries, HelicalArcValue, SemanticLayer } from '@ch-ui/tokens';

export type PhysicalPalette = Omit<HelicalArcSeries, 'physicalValueRelation'>;
export type ColorSememes = SemanticLayer<string, string, HelicalArcValue>['sememes'];
