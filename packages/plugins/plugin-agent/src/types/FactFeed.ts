//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';
import { RDF } from '@dxos/pipeline-rdf';

/** `kind` of a fact feed: a feed of {@link FactItem}s, which an agent's brain can index. */
export const KIND = 'org.dxos.plugin.agent.facts';

/**
 * One extracted fact, as an item of a fact feed. The fact is nested rather than spread: its own `id` is the
 * statement's IRI-derived id, which must not take the place of the ECHO object id.
 */
export class FactItem extends Type.makeObject<FactItem>(DXN.make('org.dxos.type.agent.fact', '0.1.0'))(
  Schema.Struct({ fact: RDF.Fact }),
) {}

/** A fact as a fact feed item. */
export const makeItem = (fact: RDF.Fact): FactItem => Obj.make(FactItem, { fact });
