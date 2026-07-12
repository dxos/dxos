//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

import { type Adapter, type Lens } from './lens';

//
// The runner executes a declarative {@link Lens} against a live ECHO object, both directions. It applies
// the `adapters` (ref resolution, array<->string, object metadata, scalar value coercions) and — when
// present — the panproto `migration` (structural renames), which it loads lazily from the `./wasm`
// engine entrypoint so the wasm never enters this module's static graph.
//

/** A text codec named by an adapter's `format` (e.g. `markdown-html`). */
export type TextFormat = { readonly encode: (input: string) => string; readonly decode: (input: string) => string };

/** A ref codec named by an adapter's `refType` (e.g. `text`). Owns the ECHO/`@dxos/schema` specifics. */
export type RefType = {
  readonly read: (ref: unknown) => Promise<string | undefined>;
  readonly make: (content: string) => unknown;
};

const textFormats = new Map<string, TextFormat>();
const refTypes = new Map<string, RefType>();

/** Register a text codec (e.g. markdown<->HTML) referenced by adapters via `format`. */
export const registerTextFormat = (name: string, format: TextFormat): void => {
  textFormats.set(name, format);
};

/** Register a ref codec (load<->make of a `Ref<Text>`) referenced by adapters via `refType`. */
export const registerRefType = (name: string, refType: RefType): void => {
  refTypes.set(name, refType);
};

const isEmpty = (value: unknown): boolean =>
  value == null || value === '' || (Array.isArray(value) && value.length === 0);

/** Widen a date-only value (`YYYY-MM-DD`) to an ISO datetime; longer strings pass through. */
const widenDate = (value: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value);

// Deep-set a value in a plain-JSON tree, creating intermediate objects. Nodes are untyped (`unknown`)
// during this dynamic-path traversal, so each descent coerces to a record.
const setPath = (target: Record<string, unknown>, path: readonly string[], value: unknown): void => {
  let node = target;
  for (let index = 0; index < path.length - 1; index++) {
    const key = path[index];
    node[key] = (node[key] as Record<string, unknown>) ?? {};
    node = node[key] as Record<string, unknown>;
  }
  node[path[path.length - 1]] = value;
};

// Object metadata timestamps (`createdAt`/`updatedAt`) as ISO strings. A required wire field like
// `createdAt` must always be a string, so a not-yet-persisted object defaults to the epoch.
const readMeta = (object: Obj.Unknown, field: string): string => {
  const meta = Obj.getMeta(object);
  const value = field === 'createdAt' ? meta.createdAt : field === 'updatedAt' ? meta.updatedAt : undefined;
  return new Date(typeof value === 'number' ? value : 0).toISOString();
};

/** Produce the encoded value for one adapter from the live ECHO object (undefined ⇒ omit). */
const encodeAdapter = async (adapter: Adapter, object: Obj.Unknown): Promise<unknown> => {
  switch (adapter.kind) {
    case 'scalar':
      return Obj.getValue(object, adapter.echo);
    case 'array': {
      const value = Obj.getValue(object, adapter.echo);
      const parts = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
      return parts.length > 0 ? parts.join(adapter.separator) : undefined;
    }
    case 'ref': {
      const refType = refTypes.get(adapter.ref.refType);
      const content = await refType?.read(Obj.getValue(object, adapter.echo));
      if (content == null || content.trim().length === 0) {
        return undefined;
      }
      const format = adapter.ref.format ? textFormats.get(adapter.ref.format) : undefined;
      return format ? format.encode(content) : content;
    }
    case 'meta':
      return readMeta(object, adapter.metaField);
    case 'prefix': {
      const value = Obj.getValue(object, adapter.echo);
      return typeof value === 'string' && value.length > 0 ? `${adapter.prefix}${value}` : undefined;
    }
    case 'dateOnly': {
      const value = Obj.getValue(object, adapter.echo);
      return typeof value === 'string' && value.length > 0 ? widenDate(value) : undefined;
    }
    case 'timestamp': {
      const value = Obj.getValue(object, adapter.echo);
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
      return adapter.fallbackMeta ? readMeta(object, adapter.fallbackMeta) : undefined;
    }
    case 'struct': {
      const nested: Record<string, unknown> = {};
      for (const field of adapter.fields) {
        const value = await encodeAdapter(field, object);
        if (!isEmpty(value)) {
          nested[field.wire] = value;
        }
      }
      return Object.keys(nested).length > 0 ? nested : undefined;
    }
    case 'derive': {
      const value = Obj.getValue(object, adapter.from);
      return typeof value === 'string' && value.length > 0 ? adapter.template.replace('{0}', value) : undefined;
    }
  }
};

/** Apply one adapter's wire value back onto the ECHO-shaped result object. */
const decodeAdapter = (adapter: Adapter, record: Record<string, unknown>, out: Record<string, unknown>): void => {
  const raw = record[adapter.wire];
  switch (adapter.kind) {
    case 'scalar':
      if (raw !== undefined) {
        setPath(out, adapter.echo, raw);
      }
      return;
    case 'array':
      setPath(out, adapter.echo, typeof raw === 'string' ? raw.split(adapter.separator).filter(Boolean) : []);
      return;
    case 'ref': {
      const refType = refTypes.get(adapter.ref.refType);
      const format = adapter.ref.format ? textFormats.get(adapter.ref.format) : undefined;
      const decoded = typeof raw === 'string' ? (format ? format.decode(raw) : raw) : undefined;
      if (decoded != null) {
        setPath(out, adapter.echo, refType?.make(decoded));
      } else if (adapter.ref.alwaysCreate) {
        setPath(out, adapter.echo, refType?.make(''));
      }
      return;
    }
    case 'meta':
    case 'derive':
      // Wire-only (object metadata / synthesized links); no ECHO home.
      return;
    case 'prefix':
      if (typeof raw === 'string') {
        setPath(out, adapter.echo, raw.startsWith(adapter.prefix) ? raw.slice(adapter.prefix.length) : raw);
      }
      return;
    case 'dateOnly':
      if (typeof raw === 'string') {
        setPath(out, adapter.echo, raw.slice(0, 10));
      }
      return;
    case 'timestamp':
      if (typeof raw === 'string') {
        setPath(out, adapter.echo, raw);
      }
      return;
    case 'struct': {
      const nested = raw != null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      for (const field of adapter.fields) {
        decodeAdapter(field, nested, out);
      }
      return;
    }
  }
};

/** Encode a live ECHO object to its foreign record via the lens (ECHO effects, then structural pass). */
export const encode = async (object: Obj.Unknown, lens: Lens): Promise<Record<string, unknown>> => {
  const record: Record<string, unknown> = {};
  for (const adapter of lens.adapters) {
    const value = await encodeAdapter(adapter, object);
    if (!isEmpty(value)) {
      record[adapter.wire] = value;
    }
  }
  for (const key of lens.gate ?? []) {
    if (isEmpty(record[key])) {
      delete record[key];
    }
  }
  if (lens.migration) {
    const { migrate } = await import('./wasm');
    return migrate({
      sourceLexicon: lens.migration.sourceLexicon,
      targetLexicon: lens.migration.targetLexicon,
      sourceVertex: lens.migration.sourceVertex,
      renames: lens.migration.renames,
      record,
    });
  }
  return record;
};

/** Decode a foreign record to ECHO-shaped field values via the lens (structural reverse, then effects). */
export const decode = async (record: Record<string, unknown>, lens: Lens): Promise<Record<string, unknown>> => {
  let source = record;
  if (lens.migration) {
    const { migrate } = await import('./wasm');
    source = await migrate({
      sourceLexicon: lens.migration.targetLexicon,
      targetLexicon: lens.migration.sourceLexicon,
      sourceVertex: lens.migration.targetVertex,
      renames: (lens.migration.renames ?? []).map(({ from, to }) => ({ from: to, to: from })),
      record,
    });
  }
  const out: Record<string, unknown> = {};
  for (const adapter of lens.adapters) {
    decodeAdapter(adapter, source, out);
  }
  return out;
};
