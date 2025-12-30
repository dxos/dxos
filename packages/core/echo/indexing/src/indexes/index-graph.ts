//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { EntityKind } from '@dxos/echo/internal';
import { ObjectStructure, decodeReference } from '@dxos/echo-protocol';
import { InternalError } from '@dxos/errors';
import { ObjectId, PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ObjectPointerEncoded } from '@dxos/protocols';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';
import { defaultMap, entries } from '@dxos/util';

import {
  EscapedPropPath,
  type FindResult,
  type Index,
  type IndexQuery,
  type IndexStaticProps,
  type LoadProps,
  staticImplements,
} from '../types';

/**
 * Indexes graph relationships between objects.
 * Includes incoming references for relations as well.
 */
@trace.resource()
@staticImplements<IndexStaticProps>()
export class IndexGraph extends Resource implements Index {
  private _identifier = PublicKey.random().toString();
  public readonly kind: IndexKind = { kind: IndexKind.Kind.GRAPH };
  public readonly updated = new Event<void>();

  /**
   * Tracks inbound references for each object.
   *
   * target object id -> prop name -> set of source object ids
   */
  private readonly _inboundReferences = new Map<ObjectId, Map<string, Set<ObjectPointerEncoded>>>();

  /**
   * Tracks relation targets for each object.
   *
   * relation target object id -> set of relation ids
   */
  private readonly _relationTargets = new Map<ObjectId, Set<ObjectPointerEncoded>>();

  /**
   * Tracks relation sources for each object.
   *
   * relation source object id -> set of relation ids
   */
  private readonly _relationSources = new Map<ObjectId, Set<ObjectPointerEncoded>>();

  /**
   * Mapping from the object to the list of reference targets.
   * We need this because on index update we don't know what the previous version of the object was.
   * This mapping is used to remove the old relations on update.
   */
  // TODO(dmaretskyi): Index should have access to the previous state on update.
  private readonly _objectToTargets = new Map<ObjectPointerEncoded, Set<ObjectId>>();

  get identifier() {
    return this._identifier;
  }

  @trace.span({ showInBrowserTimeline: true })
  async update(id: ObjectPointerEncoded, object: ObjectStructure): Promise<boolean> {
    const kind = ObjectStructure.getEntityKind(object);
    switch (kind) {
      case EntityKind.Object: {
        // Clear old links.
        this._removeReferencesFrom(id);
        this._trackOutgoingReferences(id, object);

        break;
      }
      case EntityKind.Relation: {
        this._removeReferencesFrom(id);
        this._trackOutgoingReferences(id, object);

        const targetMapping = defaultMap(this._objectToTargets, id, () => new Set());
        const source = ObjectStructure.getRelationSource(object);
        const target = ObjectStructure.getRelationTarget(object);
        if (source) {
          const sourceObject = decodeReference(source).toDXN().asEchoDXN()?.echoId;
          if (sourceObject) {
            defaultMap(this._relationSources, sourceObject, () => new Set()).add(id);
            targetMapping.add(sourceObject);
          }
        } else {
          log.warn('relation has no source', { id });
        }
        if (target) {
          const targetObject = decodeReference(target).toDXN().asEchoDXN()?.echoId;
          if (targetObject) {
            defaultMap(this._relationTargets, targetObject, () => new Set()).add(id);
            targetMapping.add(targetObject);
          }
        } else {
          log.warn('relation has no target', { id });
        }
        break;
      }
      default: {
        log.warn('unknown entity kind', { kind });
        break;
      }
    }

    return true; // TODO(dmaretskyi): Actually check if anything changed. This will cause the index to be saved on every object change batch.
  }

  async remove(id: ObjectPointerEncoded): Promise<void> {
    this._removeReferencesFrom(id);
  }

  private _removeReferencesFrom(id: ObjectPointerEncoded): void {
    for (const target of this._objectToTargets.get(id) ?? []) {
      const perField = this._inboundReferences.get(target);
      if (!perField) {
        continue;
      }
      // TODO(dmaretskyi): Not efficient, but unlikely to cause issues.
      for (const field of perField.keys()) {
        perField.get(field)?.delete(id);
      }

      // TODO(dmaretskyi): Technically relation endpoints cannot change, but we still track them here for safety.
      this._relationTargets.get(target)?.delete(id);
      this._relationSources.get(target)?.delete(id);
    }

    this._objectToTargets.get(id)?.clear();
  }

  private _trackOutgoingReferences(id: ObjectPointerEncoded, object: ObjectStructure): void {
    const targetMapping = defaultMap(this._objectToTargets, id, () => new Set());

    const references = ObjectStructure.getAllOutgoingReferences(object);
    for (const { path, reference } of references) {
      const targetObject = decodeReference(reference).toDXN().asEchoDXN()?.echoId;
      if (!targetObject) {
        continue;
      }
      const escapedPath = EscapedPropPath.escape(path);
      Function.pipe(
        this._inboundReferences,
        (map) => defaultMap(map, targetObject, () => new Map()),
        (map) => defaultMap(map, escapedPath, () => new Set()),
      ).add(id);

      targetMapping.add(targetObject);
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  async find(filter: IndexQuery): Promise<FindResult[]> {
    if (filter.inverted || filter.typenames.length > 0 || !filter.graph) {
      throw new InternalError({ message: 'Invalid filter for graph query' });
    }

    const { kind, anchors, property } = filter.graph;

    switch (kind) {
      case 'inbound-reference': {
        const results: FindResult[] = [];
        for (const anchor of anchors) {
          const sources = this._inboundReferences.get(anchor);
          if (!sources) {
            continue;
          }
          if (property !== null) {
            for (const [escapedProp, source] of sources.entries()) {
              const prop = EscapedPropPath.unescape(escapedProp);
              const firstSegmentMatches = prop[0] === property;
              const secondSegmentIsNumeric = !isNaN(Number(prop[1]));
              if (firstSegmentMatches && (prop.length === 1 || (prop.length === 2 && secondSegmentIsNumeric))) {
                results.push(...Array.from(source).map((id) => ({ id, rank: 0 })));
              }
            }
          } else {
            for (const source of sources.values()) {
              results.push(...Array.from(source).map((id) => ({ id, rank: 0 })));
            }
          }
        }
        return results;
      }
      case 'relation-source': {
        const results: FindResult[] = [];
        for (const anchor of anchors) {
          const sources = this._relationSources.get(anchor);
          if (!sources) {
            continue;
          }
          results.push(...Array.from(sources).map((id) => ({ id, rank: 0 })));
        }
        return results;
      }
      case 'relation-target': {
        const results: FindResult[] = [];
        for (const anchor of anchors) {
          const sources = this._relationTargets.get(anchor);
          if (!sources) {
            continue;
          }
          results.push(...Array.from(sources).map((id) => ({ id, rank: 0 })));
        }
        return results;
      }
      default: {
        throw new TypeError('Unknown graph query kind');
      }
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  async serialize(): Promise<string> {
    const data: GraphIndexData = {
      inboundReferences: Object.fromEntries(
        [...this._inboundReferences.entries()].map(([target, perProp]) => [
          target,
          Object.fromEntries([...perProp.entries()].map(([prop, sources]) => [prop, Array.from(sources)])),
        ]),
      ),
      relationTargets: Object.fromEntries(
        [...this._relationTargets.entries()].map(([target, sources]) => [target, Array.from(sources)]),
      ),
      relationSources: Object.fromEntries(
        [...this._relationSources.entries()].map(([target, sources]) => [target, Array.from(sources)]),
      ),
      objectToTargets: Object.fromEntries(
        [...this._objectToTargets.entries()].map(([target, sources]) => [target, Array.from(sources)]),
      ),
    };
    return JSON.stringify(data);
  }

  @trace.span({ showInBrowserTimeline: true })
  static async load({ serialized, identifier }: LoadProps): Promise<IndexGraph> {
    const index = new IndexGraph();
    await index.open();

    const data = GraphIndexData.pipe(Schema.decodeUnknownSync)(JSON.parse(serialized));
    index._loadFrom(data);
    return index;
  }

  private _loadFrom(data: GraphIndexData): void {
    this._inboundReferences.clear();
    this._relationTargets.clear();
    this._relationSources.clear();
    this._objectToTargets.clear();

    for (const [target, perProp] of entries(data.inboundReferences)) {
      const propMap = new Map<string, Set<ObjectPointerEncoded>>();
      this._inboundReferences.set(target, propMap);
      for (const [prop, sources] of entries(perProp)) {
        propMap.set(prop, new Set(sources));
      }
    }

    for (const [target, sources] of entries(data.relationTargets)) {
      this._relationTargets.set(target, new Set(sources));
    }

    for (const [target, sources] of entries(data.relationSources)) {
      this._relationSources.set(target, new Set(sources));
    }

    for (const [target, sources] of entries(data.objectToTargets)) {
      this._objectToTargets.set(target, new Set(sources));
    }
  }
}

const GraphIndexData = Schema.Struct({
  inboundReferences: Schema.Record({
    key: ObjectId,
    value: Schema.Record({
      key: EscapedPropPath,
      value: Schema.Array(ObjectPointerEncoded),
    }),
  }),
  relationTargets: Schema.Record({
    key: ObjectId,
    value: Schema.Array(ObjectPointerEncoded),
  }),
  relationSources: Schema.Record({
    key: ObjectId,
    value: Schema.Array(ObjectPointerEncoded),
  }),
  objectToTargets: Schema.Record({
    key: ObjectPointerEncoded,
    value: Schema.Array(ObjectId),
  }),
});
interface GraphIndexData extends Schema.Schema.Type<typeof GraphIndexData> {}
