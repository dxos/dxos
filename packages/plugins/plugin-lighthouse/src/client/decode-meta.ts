//
// Copyright 2026 DXOS.org
//

// Normalisers for the graph, the trace and lighthouse's own state (plugins, vocabulary, issues, storage).

import { asNumber, asRecord, asString, toProvenance } from './decode.ts';
import {
  type ExplainCategory,
  type ExplainNode,
  type GraphEdge,
  type GraphNode,
  type Issue,
  type IssueStatus,
  type NodeFacts,
  type Plugin,
  type Predicate,
  type SubjectGraph,
  type Value,
} from './types.ts';

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asStrings = (value: unknown): string[] =>
  asArray(value).filter((item): item is string => typeof item === 'string');

const isValue = (value: unknown): value is Value =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const toProps = (value: unknown): Record<string, Value[]> => {
  const props: Record<string, Value[]> = {};
  for (const [key, values] of Object.entries(asRecord(value) ?? {})) {
    const list = (Array.isArray(values) ? values : [values]).filter(isValue);
    if (list.length) {
      props[key] = list;
    }
  }
  return props;
};

const toGraphNode = (value: unknown): GraphNode | undefined => {
  const record = asRecord(value);
  const id = asString(record?.id);
  if (!record || !id) {
    return undefined;
  }
  const depth = asNumber(record.depth);
  return {
    id,
    types: asStrings(record.types),
    label: asString(record.label) ?? id.replace(/^.*[/#:]/, ''),
    props: toProps(record.props),
    ...(asString(record.image) ? { image: asString(record.image) } : {}),
    ...(depth !== undefined ? { depth } : {}),
    ...(asString(record.kind) ? { kind: asString(record.kind) } : {}),
  };
};

const toGraphEdge = (value: unknown): GraphEdge | undefined => {
  const record = asRecord(value);
  const from = asString(record?.from);
  const to = asString(record?.to);
  // The CLI names it `predicate`, the web server `p`.
  const predicate = asString(record?.predicate) ?? asString(record?.p);
  return from && to && predicate
    ? { from, to, predicate, ...(record?.derived === true ? { derived: true } : {}) }
    : undefined;
};

/** A subject graph from `GET /v1/graph` (`{ root | roots | focus, nodes, edges, more? }`). */
export const toSubjectGraph = (value: unknown): SubjectGraph => {
  const record = asRecord(value);
  const roots = [
    ...asStrings(record?.roots),
    ...[asString(record?.root), asString(record?.focus)].filter((root): root is string => !!root),
  ];
  const more: Record<string, number> = {};
  for (const [id, count] of Object.entries(asRecord(record?.more) ?? {})) {
    const number = asNumber(count);
    if (number !== undefined) {
      more[id] = number;
    }
  }
  return {
    roots: [...new Set(roots)],
    nodes: asArray(record?.nodes).flatMap((node) => toGraphNode(node) ?? []),
    edges: asArray(record?.edges).flatMap((edge) => toGraphEdge(edge) ?? []),
    more,
  };
};

/** One node's facts from `GET /v1/graph/node` (`{ id, facts: [{ p | predicate, o | value, ref, from }] }`). */
export const toNodeFacts = (value: unknown): NodeFacts => {
  const record = asRecord(value);
  return {
    id: asString(record?.id) ?? '',
    facts: asArray(record?.facts).flatMap((fact): NodeFacts['facts'] => {
      const fields = asRecord(fact);
      const predicate = asString(fields?.predicate) ?? asString(fields?.p);
      const object = fields?.value ?? fields?.o;
      if (!predicate || !isValue(object)) {
        return [];
      }
      return [
        {
          predicate,
          value: object,
          ref: fields?.ref === true,
          from: asArray(fields?.from).flatMap((source) => {
            const provenance = toProvenance({ extractor: 'unknown', at: '', ...asRecord(source) });
            return provenance ? [provenance] : [];
          }),
        },
      ];
    }),
  };
};

const CATEGORIES: readonly ExplainCategory[] = ['llm', 'system-one', 'tool'];

const toHistogram = (value: unknown): Record<string, number> | undefined => {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const histogram: Record<string, number> = {};
  for (const [key, count] of Object.entries(record)) {
    const number = asNumber(count);
    if (number !== undefined) {
      histogram[key] = number;
    }
  }
  return histogram;
};

/** A trace tree from `GET /v1/sessions/:run/explain`. */
export const toExplainNode = (value: unknown): ExplainNode | undefined => {
  const record = asRecord(value);
  const id = asString(record?.id) ?? (asNumber(record?.seq) !== undefined ? String(asNumber(record?.seq)) : undefined);
  if (!record || !id) {
    return undefined;
  }
  const node: ExplainNode = {
    id,
    kind: asString(record.kind) ?? 'other',
    label: asString(record.label) ?? '',
    t: asString(record.t) ?? '',
    totalUsd: asNumber(record.totalUsd) ?? 0,
    pages: asNumber(record.pages) ?? 0,
    facts: asNumber(record.facts) ?? 0,
    results: asNumber(record.results) ?? 0,
    seq: asNumber(record.seq) ?? 0,
    children: asArray(record.children).flatMap((child) => toExplainNode(child) ?? []),
  };
  const category = CATEGORIES.find((candidate) => candidate === record.category);
  if (category) {
    node.category = category;
  }
  const numbers = {
    group: record.group,
    ms: record.ms,
    wallMs: record.wallMs,
    usd: record.usd,
    subjects: record.subjects,
  };
  for (const [key, field] of Object.entries(numbers)) {
    const number = asNumber(field);
    if (
      number !== undefined &&
      (key === 'group' || key === 'ms' || key === 'wallMs' || key === 'usd' || key === 'subjects')
    ) {
      node[key] = number;
    }
  }
  const strings = { detail: record.detail, error: record.error, model: record.model };
  for (const [key, field] of Object.entries(strings)) {
    const text = asString(field);
    if (text !== undefined && (key === 'detail' || key === 'error' || key === 'model')) {
      node[key] = text;
    }
  }
  if (typeof record.ok === 'boolean') {
    node.ok = record.ok;
  }
  const tokens = asRecord(record.tokens);
  if (tokens) {
    node.tokens = {};
    for (const key of ['in', 'out', 'cached'] as const) {
      const number = asNumber(tokens[key]);
      if (number !== undefined) {
        node.tokens[key] = number;
      }
    }
  }
  const predicates = toHistogram(record.predicates);
  if (predicates) {
    node.predicates = predicates;
  }
  const types = toHistogram(record.types);
  if (types) {
    node.types = types;
  }
  return node;
};

export const toPlugins = (value: unknown): Plugin[] =>
  // The web server's /api/meta nests them as `{ plugins: { plugins: [...] } }`.
  (Array.isArray(value) ? value : asArray(asRecord(value)?.plugins)).flatMap((item): Plugin[] => {
    const record = asRecord(item);
    const id = asString(record?.id);
    if (!record || !id) {
      return [];
    }
    const contributes: Plugin['contributes'] = {};
    for (const [kind, entry] of Object.entries(asRecord(record.contributes) ?? {})) {
      const number = asNumber(entry);
      contributes[kind] = number ?? asStrings(entry);
    }
    return [
      {
        id,
        hosts: asStrings(record.hosts),
        contributes,
        ...(asString(record.name) ? { name: asString(record.name) } : {}),
        ...(asString(record.description) ? { description: asString(record.description) } : {}),
        ...(typeof record.core === 'boolean' ? { core: record.core } : {}),
      },
    ];
  });

export const toPredicates = (value: unknown): Predicate[] =>
  (Array.isArray(value) ? value : asArray(asRecord(value)?.predicates)).flatMap((item): Predicate[] => {
    const record = asRecord(item);
    const iri = asString(record?.iri) ?? asString(record?.id);
    if (!record || !iri) {
      return [];
    }
    return [
      {
        iri,
        synonyms: asStrings(record.synonyms),
        extractors: asStrings(record.extractors),
        ...((asString(record.label) ?? asString(record.name))
          ? { label: asString(record.label) ?? asString(record.name) }
          : {}),
        ...(asString(record.description) ? { description: asString(record.description) } : {}),
        ...(asString(record.domain) ? { domain: asString(record.domain) } : {}),
        ...(asString(record.range) ? { range: asString(record.range) } : {}),
      },
    ];
  });

const STATUSES: readonly IssueStatus[] = ['open', 'in-progress', 'fixed', 'wontfix'];

export const toIssue = (value: unknown): Issue | undefined => {
  const record = asRecord(value);
  const id = asString(record?.id);
  const status = STATUSES.find((candidate) => candidate === record?.status);
  if (!record || !id || !status) {
    return undefined;
  }
  return {
    id,
    status,
    kind: asString(record.kind) ?? '',
    title: asString(record.title) ?? id,
    body: asString(record.body) ?? '',
    opened: asString(record.opened) ?? '',
    updated: asString(record.updated) ?? '',
    seen: asNumber(record.seen) ?? 1,
    notes: asArray(record.notes).flatMap((note): Issue['notes'] => {
      const fields = asRecord(note);
      const text = asString(fields?.text);
      const noteStatus = STATUSES.find((candidate) => candidate === fields?.status);
      return text
        ? [
            {
              t: asString(fields?.t) ?? '',
              text,
              ...(asString(fields?.by) ? { by: asString(fields?.by) } : {}),
              ...(noteStatus ? { status: noteStatus } : {}),
            },
          ]
        : [];
    }),
    ...(asString(record.domain) ? { domain: asString(record.domain) } : {}),
    ...(asString(record.url) ? { url: asString(record.url) } : {}),
    ...(asString(record.severity) ? { severity: asString(record.severity) } : {}),
    ...(asString(record.by) ? { by: asString(record.by) } : {}),
    ...(asString(record.resolution) ? { resolution: asString(record.resolution) } : {}),
  };
};

export const toIssues = (value: unknown): Issue[] =>
  (Array.isArray(value) ? value : asArray(asRecord(value)?.issues)).flatMap((item) => toIssue(item) ?? []);
