//
// Copyright 2026 DXOS.org
//

import { createHash } from 'node:crypto';

import * as Ontology from '../../Ontology.ts';
import * as Term from './Term.ts';

/**
 * Type terms as JSON-LD nodes for the file graph (`design/TYPES.md`, "RDF"). Node IRIs are hashes of
 * the canonical text, so a type used twice in a file is one node, and the same type in two files is
 * the same IRI — each graph asserting identical facts about it.
 */

/** Terms larger than this are scored but not emitted: the facts would outweigh their use. */
export const EMISSION_BUDGET = 64;

export type Emitted = Ontology.TypeNode | Ontology.TypePropertyNode;

export const typeIri = (type: Term.Type): string =>
  `${Ontology.TYPE_BASE}${createHash('sha256').update(Term.text(type)).digest('base64url').slice(0, 22)}`;

/** Collects type nodes for one document; `add` returns the root IRI, or `undefined` if nothing is emitted. */
export const collector = () => {
  const nodes = new Map<string, Emitted>();

  const emit = (type: Term.Type): string | undefined => {
    if (type.kind === 'unknown') {
      return undefined;
    }
    const iri = typeIri(type);
    if (nodes.has(iri)) {
      return iri;
    }
    const node: Record<string, unknown> = {
      '@id': iri,
      '@type': 'Type',
      'typeKind': type.kind,
      'typeText': Term.text(type),
      ...(Term.isPartial(type) ? { typePartial: true } : {}),
    };
    // Registered before the children so a recursive term (there are none today) cannot loop.
    nodes.set(iri, toTypeNode(node));
    const positions = (prefix: string, entries: readonly Term.Type[]) => {
      entries.slice(0, Ontology.POSITIONS).forEach((entry, index) => {
        const child = emit(entry);
        if (child) {
          node[`${prefix}${index}`] = child;
        }
      });
    };
    switch (type.kind) {
      case 'ref':
        node.typeHead = type.iri;
        positions('typeArg', type.args);
        break;
      case 'typeof':
        node.typeHead = type.iri;
        break;
      case 'literal':
        node.literalValue = Term.text(type);
        break;
      case 'union':
      case 'intersection':
        node.typeMember = type.members.flatMap((member) => emit(member) ?? []);
        break;
      case 'tuple':
        positions(
          'typeElement',
          type.elements.map((element) => element.type),
        );
        break;
      case 'function': {
        positions(
          'typeParam',
          type.params.map((entry) => entry.type),
        );
        const returns = emit(type.returns);
        if (returns) {
          node.returnType = returns;
        }
        break;
      }
      case 'object':
        node.typeProperty = type.properties.map((property) => {
          const propertyIri = `${iri}/${encodeURIComponent(property.name)}`;
          const propertyType = emit(property.type);
          nodes.set(propertyIri, {
            '@id': propertyIri,
            '@type': 'TypeProperty',
            'name': property.name,
            ...(propertyType ? { hasType: propertyType } : {}),
            'optional': property.optional,
            'readonly': property.readonly,
          });
          return propertyIri;
        });
        break;
      default:
        break;
    }
    nodes.set(iri, toTypeNode(node));
    return iri;
  };

  return {
    /** The IRI to assert as `deus:hasType`, when the term is known and within budget. */
    add: (type: Term.Type): string | undefined =>
      type.kind === 'unknown' || Term.size(type) > EMISSION_BUDGET ? undefined : emit(type),
    nodes: (): Emitted[] => [...nodes.values()],
  };
};

/** The node as the document schema types it; the record is built field by field above. */
const toTypeNode = (node: Record<string, unknown>): Ontology.TypeNode => {
  const text = (key: string) => (typeof node[key] === 'string' ? { [key]: node[key] } : {});
  const list = (key: string) =>
    Array.isArray(node[key]) ? { [key]: node[key].filter((entry): entry is string => typeof entry === 'string') } : {};
  const positional = Object.fromEntries(
    Object.entries(node).filter(
      (entry): entry is [string, string] =>
        /^type(Arg|Element|Param)\d$/.test(entry[0]) && typeof entry[1] === 'string',
    ),
  );
  return {
    '@id': String(node['@id']),
    '@type': 'Type',
    'typeKind': String(node.typeKind),
    'typeText': String(node.typeText),
    ...text('typeHead'),
    ...text('returnType'),
    ...text('literalValue'),
    ...list('typeMember'),
    ...list('typeProperty'),
    ...(node.typePartial === true ? { typePartial: true } : {}),
    ...positional,
  };
};
