//
// Copyright 2026 DXOS.org
//

import { type Entity } from '#client';
import { type Finding } from '#types';

/** A kept Finding as the entity it was copied from, so it renders like a live result. */
export const findingEntity = (finding: Finding.Finding): Entity => ({
  id: finding.iri,
  types: [...finding.types],
  props: Object.fromEntries(Object.entries(finding.properties).map(([key, values]) => [key, [...values]])),
  provenance: finding.provenance.map(({ extractor, source, at }) => ({ extractor, at, ...(source ? { source } : {}) })),
});
