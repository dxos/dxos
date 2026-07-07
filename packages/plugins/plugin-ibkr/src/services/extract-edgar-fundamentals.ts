//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import {
  EdgarAdditionalFactsAnnotation,
  EdgarAsOfConceptsAnnotation,
  EdgarFieldAnnotation,
  type EdgarFieldSource,
} from '../annotations';
import { type Ibkr } from '../types';

type EdgarFact = {
  end: string;
  filed: string;
  val: number;
  fp?: string;
  form?: string;
};

export type GaapFacts = Record<
  string,
  {
    units?: Record<string, EdgarFact[]>;
  }
>;

const DEFAULT_UNIT_KEYS = ['USD', 'USD/shares', 'shares'] as const;

const isOption = (node: SchemaAST.AST): node is SchemaAST.Union =>
  SchemaAST.isUnion(node) && node.types.length === 2 && SchemaAST.isUndefinedKeyword(node.types[1]);

const reduceRefinements = (type: SchemaAST.AST): SchemaAST.AST => {
  if (SchemaAST.isRefinement(type)) {
    return reduceRefinements({
      ...type.from,
      annotations: { ...type.from.annotations, ...type.annotations },
    } as SchemaAST.AST);
  }
  return type;
};

const unwrapOptionalType = (type: SchemaAST.AST): SchemaAST.AST => {
  if (isOption(type)) {
    return type.types[0]!;
  }
  return type;
};

const propertyBaseType = (property: SchemaAST.PropertySignature): SchemaAST.AST => {
  const encoded = SchemaAST.encodedBoundAST(property.type);
  const unwrapped = property.isOptional && SchemaAST.isUnion(encoded) ? encoded.types[0]! : encoded;
  return reduceRefinements(unwrapped);
};

const isNestedType = (node: SchemaAST.AST): boolean => SchemaAST.isTypeLiteral(reduceRefinements(node));

const findTypeLiteral = (node: SchemaAST.AST): SchemaAST.TypeLiteral | undefined => {
  const base = reduceRefinements(node);
  if (SchemaAST.isTypeLiteral(base)) {
    return base;
  }
  return undefined;
};

const hasDefinedValues = (values: Record<string, unknown>): boolean =>
  Object.values(values).some((value) => value != null);

/** Picks the latest filed fact across the given us-gaap concepts. */
export const pickLatestFact = (
  facts: GaapFacts | undefined,
  concepts: readonly string[],
  unitKeys: readonly string[] = DEFAULT_UNIT_KEYS,
): EdgarFact | undefined => {
  if (!facts) {
    return undefined;
  }
  let latest: EdgarFact | undefined;
  for (const concept of concepts) {
    const entry = facts[concept];
    if (!entry?.units) {
      continue;
    }
    for (const unitKey of unitKeys) {
      const rows = entry.units[unitKey];
      if (!rows?.length) {
        continue;
      }
      for (const row of rows) {
        if (!latest || row.filed.localeCompare(latest.filed) > 0) {
          latest = row;
        }
      }
    }
  }
  return latest;
};

const ratio = (numerator?: number, denominator?: number): number | undefined => {
  if (numerator === undefined || denominator === undefined || denominator === 0) {
    return undefined;
  }
  return numerator / denominator;
};

const registerConcepts = (mappedConcepts: Set<string>, concepts: readonly string[]): void => {
  for (const concept of concepts) {
    mappedConcepts.add(concept);
  }
};

const extractConceptValue = (
  gaap: GaapFacts | undefined,
  source: Extract<EdgarFieldSource, { type: 'concept' }>,
  mappedConcepts: Set<string>,
): number | undefined => {
  registerConcepts(mappedConcepts, source.concepts);
  return pickLatestFact(gaap, source.concepts, source.units ?? DEFAULT_UNIT_KEYS)?.val;
};

const extractRatioValue = (
  gaap: GaapFacts | undefined,
  source: Extract<EdgarFieldSource, { type: 'ratio' }>,
  mappedConcepts: Set<string>,
): number | undefined => {
  registerConcepts(mappedConcepts, source.numerator.concepts);
  registerConcepts(mappedConcepts, source.denominator.concepts);
  const numerator = pickLatestFact(gaap, source.numerator.concepts, source.numerator.units ?? DEFAULT_UNIT_KEYS)?.val;
  const denominator = pickLatestFact(
    gaap,
    source.denominator.concepts,
    source.denominator.units ?? DEFAULT_UNIT_KEYS,
  )?.val;
  return ratio(numerator, denominator);
};

const extractFieldValue = (
  gaap: GaapFacts | undefined,
  source: EdgarFieldSource,
  mappedConcepts: Set<string>,
): number | undefined => {
  switch (source.type) {
    case 'concept':
      return extractConceptValue(gaap, source, mappedConcepts);
    case 'ratio':
      return extractRatioValue(gaap, source, mappedConcepts);
  }
};

const collectAdditionalFacts = (
  gaap: GaapFacts | undefined,
  mappedConcepts: ReadonlySet<string>,
): Record<string, number> => {
  if (!gaap) {
    return {};
  }
  const facts: Record<string, number> = {};
  for (const concept of Object.keys(gaap).sort()) {
    if (mappedConcepts.has(concept)) {
      continue;
    }
    const latest = pickLatestFact(gaap, [concept], DEFAULT_UNIT_KEYS);
    if (latest?.val !== undefined) {
      facts[concept] = latest.val;
    }
  }
  return facts;
};

const resolveAsOf = (
  gaap: GaapFacts | undefined,
  conceptGroups: readonly (readonly string[])[],
): string | undefined => {
  for (const concepts of conceptGroups) {
    const filed = pickLatestFact(gaap, concepts)?.filed;
    if (filed) {
      return filed;
    }
  }
  return undefined;
};

const extractObject = (
  ast: SchemaAST.AST,
  gaap: GaapFacts | undefined,
  mappedConcepts: Set<string>,
): Record<string, unknown> | undefined => {
  const typeLiteral = findTypeLiteral(ast);
  if (!typeLiteral) {
    return undefined;
  }

  const result: Record<string, unknown> = {};
  for (const property of SchemaAST.getPropertySignatures(typeLiteral)) {
    const name = property.name.toString();
    const propertyType = unwrapOptionalType(property.type);
    const baseType = propertyBaseType(property);

    if (EdgarAdditionalFactsAnnotation.getFromAst(baseType).pipe(Option.getOrElse(() => false))) {
      const additionalFacts = collectAdditionalFacts(gaap, mappedConcepts);
      if (Object.keys(additionalFacts).length > 0) {
        result[name] = additionalFacts;
      }
      continue;
    }

    const mapping = EdgarFieldAnnotation.getFromAst(baseType);
    if (Option.isSome(mapping)) {
      const value = extractFieldValue(gaap, mapping.value, mappedConcepts);
      if (value != null) {
        result[name] = value;
      }
      continue;
    }

    if (isNestedType(propertyType)) {
      const nested = extractObject(propertyType, gaap, mappedConcepts);
      if (nested && hasDefinedValues(nested)) {
        result[name] = nested;
      }
    }
  }

  return hasDefinedValues(result) ? result : undefined;
};

/** Walks {@link Ibkr.FundamentalsSnapshot} and fills values from SEC us-gaap company facts. */
export const extractFundamentalsFromEdgar = (
  schema: typeof Ibkr.FundamentalsSnapshot,
  gaap: GaapFacts | undefined,
): Ibkr.FundamentalsSnapshot => {
  const mappedConcepts = new Set<string>();
  const extracted = extractObject(schema.ast, gaap, mappedConcepts) ?? {};
  const asOfConceptGroups = EdgarAsOfConceptsAnnotation.get(schema).pipe(Option.getOrElse(() => []));
  const asOf = resolveAsOf(gaap, asOfConceptGroups);

  return {
    ...(asOf ? { asOf } : {}),
    ...extracted,
  };
};
