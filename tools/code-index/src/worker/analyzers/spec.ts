//
// Copyright 2026 DXOS.org
//

import * as Mdl from '../../Mdl.ts';
import * as Ontology from '../../Ontology.ts';
import { type AnalyzeContext, fileNode } from './common.ts';

/** `.mdl` documents: one `SpecBlock` per fenced block. Linking blocks to symbols is a reasoner's job. */

// Block types whose second header token names the thing described rather than labelling the block.
const NAMED_BLOCKS = new Set(['module', 'type', 'service', 'component', 'op', 'ext', 'flow', 'skill', 'capability']);

export const analyzeMdl = (context: AnalyzeContext): Ontology.FileDocument => {
  const base = fileNode(context);
  const document = Mdl.parse(context.source);
  const seen = new Map<string, number>();
  const blocks = document.blocks.map((block): Ontology.SpecBlockNode => {
    const named = NAMED_BLOCKS.has(block.type);
    const key = block.id ?? block.title ?? `${block.line}`;
    // Two blocks of one type may share a key (`test` cases, unnamed features); disambiguate in order.
    const count = (seen.get(`${block.type}:${key}`) ?? 0) + 1;
    seen.set(`${block.type}:${key}`, count);
    return {
      '@id': Ontology.specBlockIri(context.path, block.type, count === 1 ? key : `${key}~${count}`).value,
      '@type': 'SpecBlock',
      'blockType': block.type,
      ...(named ? {} : block.id ? { blockId: block.id } : {}),
      ...(named ? (block.id ? { name: block.id } : {}) : block.title ? { name: block.title } : {}),
      'field': [...block.fields],
      'mentions': [...block.mentions],
      ...(base.inPackage ? { inPackage: base.inPackage } : {}),
    };
  });
  return { ...base, declaresBlock: blocks };
};
