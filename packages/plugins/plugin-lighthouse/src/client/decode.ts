//
// Copyright 2026 DXOS.org
//

// Normalisers from lighthouse's JSON to the client's types. The /v1 API and the legacy web server (`web/server`)
// answer in different shapes; both are read here so the rest of the plugin sees one.

import { type RatingModel, type RatingOverrides } from '../model/rating.ts';
import {
  type Budget,
  type Engine,
  type Entity,
  type Extension,
  type Pick,
  type Provenance,
  type RatingState,
  type Report,
  type Session,
  type SessionStatus,
  type SessionUpdate,
  type Spend,
  type TrajectoryEvent,
  type Value,
} from './types.ts';

export const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined;

export const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

export const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asStrings = (value: unknown): string[] =>
  asArray(value).filter((item): item is string => typeof item === 'string');

const isValue = (value: unknown): value is Value =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

const toTimestamp = (value: unknown): string | undefined =>
  typeof value === 'number' ? new Date(value).toISOString() : asString(value);

export const toProvenance = (value: unknown): Provenance | undefined => {
  const record = asRecord(value);
  const extractor = asString(record?.extractor);
  const at = toTimestamp(record?.at);
  if (!record || !extractor || !at) {
    return undefined;
  }
  return {
    extractor,
    at,
    ...(asString(record.graph) ? { graph: asString(record.graph) } : {}),
    ...(asString(record.source) ? { source: asString(record.source) } : {}),
    ...(asString(record.snapshot) ? { snapshot: asString(record.snapshot) } : {}),
  };
};

export const toEntity = (value: unknown): Entity | undefined => {
  const record = asRecord(value);
  const id = asString(record?.id);
  if (!record || !id) {
    return undefined;
  }
  const props: Record<string, Value[]> = {};
  for (const [key, values] of Object.entries(asRecord(record.props) ?? {})) {
    props[key] = (Array.isArray(values) ? values : [values]).filter(isValue);
  }
  const seen = asArray(record.seen).filter((seq): seq is number => typeof seq === 'number');
  const provenance = asArray(record.provenance).flatMap((item) => toProvenance(item) ?? []);
  return {
    id,
    types: asStrings(record.types),
    props,
    ...(seen.length ? { seen } : {}),
    ...(provenance.length ? { provenance } : {}),
  };
};

/** Entities from a bare array (legacy) or a page (`{ items }`, /v1 listResults). */
export const toEntities = (value: unknown): Entity[] =>
  (Array.isArray(value) ? value : asArray(asRecord(value)?.items)).flatMap((item) => toEntity(item) ?? []);

export const toEvent = (value: unknown): TrajectoryEvent | undefined => {
  const record = asRecord(value);
  const seq = asNumber(record?.seq);
  const kind = asString(record?.kind);
  if (!record || seq === undefined || !kind) {
    return undefined;
  }
  return { seq, kind, t: asString(record.t) ?? '', data: asRecord(record.data) ?? {} };
};

export const toEvents = (value: unknown): TrajectoryEvent[] =>
  (Array.isArray(value) ? value : [value]).flatMap((item) => toEvent(item) ?? []);

const STATUSES: readonly SessionStatus[] = ['starting', 'running', 'idle', 'reported', 'stopped', 'failed'];

const toStatus = (value: unknown): SessionStatus => STATUSES.find((status) => status === value) ?? 'running';

const toPick = (value: unknown): Pick | undefined => {
  const record = asRecord(value);
  const title = asString(record?.title);
  if (!record || !title) {
    return undefined;
  }
  return {
    title,
    why: asString(record.why) ?? '',
    ...(asString(record.url) ? { url: asString(record.url) } : {}),
    ...(asString(record.subject) ? { subject: asString(record.subject) } : {}),
  };
};

const toReport = (value: unknown): Report | undefined => {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  // The legacy server names the picks `findings`; /v1 names them `picks`.
  const picks = asArray(record.picks ?? record.findings).flatMap((item) => toPick(item) ?? []);
  return {
    picks,
    ...(asString(record.answer) ? { answer: asString(record.answer) } : {}),
    ...(asString(record.gaps) ? { gaps: asString(record.gaps) } : {}),
    ...(asString(record.next) ? { next: asString(record.next) } : {}),
  };
};

const toSpend = (value: unknown): Spend => {
  const record = asRecord(value);
  return {
    seconds: asNumber(record?.seconds) ?? 0,
    usd: asNumber(record?.usd) ?? 0,
    pages: asNumber(record?.pages) ?? 0,
  };
};

const toBudget = (value: unknown): Budget => {
  const record = asRecord(value);
  const seconds = asNumber(record?.seconds);
  const minutes = asNumber(record?.minutes) ?? (seconds !== undefined ? seconds / 60 : undefined);
  const usd = asNumber(record?.usd);
  const pages = asNumber(record?.pages);
  return {
    ...(minutes !== undefined ? { minutes } : {}),
    ...(usd !== undefined ? { usd } : {}),
    ...(pages !== undefined ? { pages } : {}),
  };
};

export const toSession = (value: unknown): Session | undefined => {
  const record = asRecord(value);
  const run = asString(record?.run);
  if (!record || !run) {
    return undefined;
  }
  const status = toStatus(record.status);
  // Legacy: `budget` is `{ budget, spent, left }`; /v1: `budget` and `spent` are siblings.
  const legacyBudget = asRecord(record.budget)?.budget !== undefined ? asRecord(record.budget) : undefined;
  const model = asRecord(record.model);
  const report = toReport(record.report);
  return {
    run,
    goal: asString(record.goal) ?? '',
    status,
    busy: typeof record.busy === 'boolean' ? record.busy : status === 'starting' || status === 'running',
    budget: toBudget(legacyBudget ? legacyBudget.budget : record.budget),
    spent: toSpend(legacyBudget ? legacyBudget.spent : record.spent),
    ...(asString(record.model)
      ? { model: asString(record.model) }
      : model && asString(model.modelId)
        ? { model: `${asString(model.provider) ?? ''}/${asString(model.modelId)}` }
        : {}),
    ...(report ? { report } : {}),
    ...(asString(record.reason) ? { reason: asString(record.reason) } : {}),
    ...(toTimestamp(record.startedAt) ? { startedAt: toTimestamp(record.startedAt) } : {}),
  };
};

const isTermValue = (value: unknown): boolean => {
  const record = asRecord(value);
  return !!record && ('prop' in record || 'sum' in record || 'has' in record || 'match' in record);
};

const isTermShape = (value: unknown): boolean =>
  value === 'higher' ||
  value === 'lower' ||
  value === 'flag' ||
  (!!asRecord(value) && ['target', 'min', 'max'].some((key) => key in (asRecord(value) ?? {})));

/** Whether a value is a rating model the agent wrote (mirrors lighthouse's `validateModel`). */
export const isRatingModel = (value: unknown): value is RatingModel => {
  const record = asRecord(value);
  return (
    !!record &&
    Array.isArray(record.terms) &&
    record.terms.every((term) => {
      const fields = asRecord(term);
      return (
        !!fields &&
        typeof fields.id === 'string' &&
        typeof fields.label === 'string' &&
        typeof fields.weight === 'number' &&
        isTermValue(fields.value) &&
        isTermShape(fields.shape)
      );
    })
  );
};

const toOverrides = (value: unknown): RatingOverrides | undefined => {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const terms: Record<string, { weight?: number; off?: boolean }> = {};
  for (const [id, override] of Object.entries(asRecord(record.terms) ?? {})) {
    const fields = asRecord(override);
    const weight = asNumber(fields?.weight);
    terms[id] = { ...(weight !== undefined ? { weight } : {}), ...(fields?.off === true ? { off: true } : {}) };
  }
  const require: Record<string, { off?: boolean }> = {};
  for (const [label, override] of Object.entries(asRecord(record.require) ?? {})) {
    require[label] = asRecord(override)?.off === true ? { off: true } : {};
  }
  return { terms, require, ...(asString(record.updatedAt) ? { updatedAt: asString(record.updatedAt) } : {}) };
};

/** The rating state from a legacy (`{ rating, overrides, feedback }`) or /v1 (`{ model, overrides, feedback }`) body. */
export const toRating = (value: unknown): RatingState => {
  const record = asRecord(value);
  const model = record?.model ?? record?.rating;
  const feedback: Record<string, 'up' | 'down'> = {};
  for (const [id, vote] of Object.entries(asRecord(record?.feedback) ?? {})) {
    if (vote === 'up' || vote === 'down') {
      feedback[id] = vote;
    }
  }
  const overrides = toOverrides(record?.overrides);
  return {
    ...(isRatingModel(model) ? { model } : {}),
    ...(overrides ? { overrides } : {}),
    feedback,
  };
};

export const toExtension = (value: unknown): Extension | undefined => {
  const record = asRecord(value);
  const id = asString(record?.id);
  if (!record || !id) {
    return undefined;
  }
  const research = asRecord(record.research);
  return {
    id,
    label: asString(record.label) ?? id,
    description: asString(record.description) ?? '',
    appliesTo: asStrings(record.appliesTo),
    fields: asStrings(record.fields),
    ...(research
      ? {
          research: {
            item: asString(research.item) ?? 'item',
            items: asString(research.items) ?? 'items',
            link: asString(research.link) ?? '',
            budget: toBudget(research.budget),
          },
        }
      : {}),
  };
};

/** Extensions from a bare array (/v1) or `{ extensions }` (legacy). */
export const toExtensions = (value: unknown): Extension[] =>
  (Array.isArray(value) ? value : asArray(asRecord(value)?.extensions)).flatMap((item) => toExtension(item) ?? []);

/** Engines from /v1 `GET /engines`, or from the plugins the legacy `/api/meta` lists. */
export const toEngines = (value: unknown): Engine[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item): Engine[] => {
      const record = asRecord(item);
      const id = asString(record?.id);
      return id
        ? [
            {
              id,
              ...(asString(record?.plugin) ? { plugin: asString(record?.plugin) } : {}),
              ...(asString(record?.label) ? { label: asString(record?.label) } : {}),
              ...(asString(record?.description) ? { description: asString(record?.description) } : {}),
            },
          ]
        : [];
    });
  }
  const plugins = asArray(asRecord(asRecord(value)?.plugins)?.plugins);
  return plugins.flatMap((plugin) => {
    const record = asRecord(plugin);
    const pluginId = asString(record?.id);
    return asStrings(asRecord(record?.contributes)?.searchEngines).map((id) => ({
      id,
      ...(pluginId ? { plugin: pluginId } : {}),
    }));
  });
};

/** A stream message as a session update; unknown event types (heartbeats) answer undefined. */
export const toUpdate = (event: string, data: unknown): SessionUpdate | undefined => {
  switch (event) {
    case 'snapshot': {
      const record = asRecord(data);
      // Legacy snapshots put the rating fields at the top level; /v1 nests them under `rating`.
      const rating = toRating(asRecord(record?.rating)?.feedback !== undefined ? record?.rating : record);
      return {
        type: 'snapshot',
        snapshot: {
          session: toSession(record?.session),
          events: toEvents(record?.events ?? []),
          results: toEntities(record?.results),
          rating,
        },
      };
    }
    case 'events':
    case 'event':
      return { type: 'events', events: toEvents(data) };
    case 'results':
      return { type: 'results', results: toEntities(data) };
    case 'rating':
      return { type: 'rating', rating: toRating(data) };
    case 'session': {
      const session = toSession(data);
      return session ? { type: 'session', session } : undefined;
    }
    default:
      return undefined;
  }
};
