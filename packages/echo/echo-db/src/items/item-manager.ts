//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import pify from 'pify';

import { Event, trigger } from '@dxos/async';
import { createId } from '@dxos/crypto';
import { timed } from '@dxos/debug';
import { EchoEnvelope, FeedWriter, IEchoStream, ItemID, ItemType, LinkData, mapFeedWriter } from '@dxos/echo-protocol';
import { createTransform } from '@dxos/feed-store';
import { Model, ModelFactory, ModelMessage, ModelType } from '@dxos/model-factory';

import { UnknownModelError } from '../errors';
import { ResultSet } from '../result';
import { DefaultModel } from './default-model';
import { Item } from './item';
import { Link } from './link';

const log = debug('dxos:echo:item-manager');

export interface ItemFilter {
  type?: ItemType | ItemType[]
  parent?: ItemID | ItemID[]
  id?: ItemID | ItemID[]
}

export interface ItemConstructionOptions {
  itemId: ItemID,
  modelType: ModelType,
  itemType: ItemType | undefined,
  readStream: NodeJS.ReadableStream,
  parentId?: ItemID,
  initialMutations?: ModelMessage<Uint8Array>[],
  modelSnapshot?: Uint8Array,
  link?: LinkData
}

/**
 * Manages the creation and indexing of items.
 */
export class ItemManager {
  private readonly _itemUpdate = new Event<Item<any>>();

  private readonly _debouncedItemUpdate = debounceEvent(this._itemUpdate.discardParameter());

  // Map of active items.
  private readonly _items = new Map<ItemID, Item<any>>();

  // TODO(burdon): Lint issue: Unexpected whitespace between function name and paren
  // Map of item promises (waiting for item construction after genesis message has been written).
  // eslint-disable-next-line func-call-spacing
  private readonly _pendingItems = new Map<ItemID, (item: Item<any>) => void>();

  /**
   * @param partyKey
   * @param modelFactory
   * @param writeStream Outbound `dxos.echo.IEchoEnvelope` mutation stream.
   */
  constructor (
     private readonly _modelFactory: ModelFactory,
     private readonly _writeStream?: FeedWriter<EchoEnvelope>
  ) {}

  /**
   * Creates an item and writes the genesis message.
   * @param {ModelType} modelType
   * @param {ItemType} [itemType]
   * @param {ItemID} [parentId]
   * @param initProps
   */
  @timed(5_000)
  async createItem (
    modelType: ModelType,
    itemType?: ItemType,
    parentId?: ItemID,
    initProps?: any // TODO(burdon): Remove/change to array of mutations.
  ): Promise<Item<any>> {
    assert(this._writeStream);
    assert(modelType);

    if (!this._modelFactory.hasModel(modelType)) {
      throw new UnknownModelError(modelType);
    }

    let mutation: Uint8Array | undefined;
    if (initProps) {
      const meta = this._modelFactory.getModelMeta(modelType);
      if (!meta.getInitMutation) {
        throw new Error('Model does not support initializer.');
      }
      mutation = meta.mutation.encode(await meta.getInitMutation(initProps));
    }

    // Pending until constructed (after genesis block is read from stream).
    const [waitForCreation, callback] = trigger<Item<any>>();

    const itemId = createId();
    this._pendingItems.set(itemId, callback);

    // Write Item Genesis block.
    log('Item Genesis:', itemId);
    await this._writeStream.write({
      itemId,
      genesis: {
        itemType,
        modelType
      },
      itemMutation: parentId ? { parentId } : undefined,
      mutation
    });

    // Unlocked by construct.
    log('Pending Item:', itemId);
    return await waitForCreation();
  }

  @timed(5_000)
  async createLink (
    modelType: ModelType, itemType: ItemType | undefined, source: ItemID, target: ItemID, initProps?: any
  ): Promise<Link<any, any, any>> {
    assert(this._writeStream);
    assert(modelType);

    if (!this._modelFactory.hasModel(modelType)) {
      throw new UnknownModelError(modelType);
    }

    let mutation: Uint8Array | undefined;
    if (initProps) {
      const meta = this._modelFactory.getModelMeta(modelType);
      if (!meta.getInitMutation) {
        throw new Error('Tried to provide initialization params to a model with no initializer');
      }
      mutation = meta.mutation.encode(await meta.getInitMutation(initProps));
    }

    // Pending until constructed (after genesis block is read from stream).
    const [waitForCreation, callback] = trigger<Item<any>>();

    const itemId = createId();
    this._pendingItems.set(itemId, callback);

    // Write Item Genesis block.
    log('Item Genesis:', itemId);
    await this._writeStream.write({
      itemId,
      genesis: {
        itemType,
        modelType,
        link: { source, target }
      },
      mutation
    });

    // Unlocked by construct.
    log('Pending Item:', itemId);
    const link = await waitForCreation();
    assert(link instanceof Link);
    return link;
  }

  /**
   * Constructs an item with the appropriate model.
   * @param itemId
   * @param modelType
   * @param itemType
   * @param readStream - Inbound mutation stream (from multiplexer).
   * @param [parentId] - ItemID of the parent of this Item (optional).
   * @param initialMutations
   * @param modelSnapshot
   * @param link
   */
  // TODO(marik-d): Convert optional params to typed object.
  // TODO(burdon): Break up long function (helper function or comment blocks).
  @timed(5_000)
  async constructItem ({
    itemId,
    modelType,
    itemType,
    readStream,
    parentId,
    initialMutations,
    modelSnapshot,
    link
  }: ItemConstructionOptions) {
    assert(itemId);
    assert(modelType);
    assert(readStream);

    const parent = parentId ? this._items.get(parentId) : null;
    if (parentId && !parent) {
      throw new Error(`Missing parent: ${parentId}`);
    }

    // TODO(burdon): Skip genesis message (and subsequent messages) if unknown model. Build map of ignored items.
    if (!this._modelFactory.hasModel(modelType)) {
      throw new UnknownModelError(modelType);
    }
    const modelMeta = this._modelFactory.getModelMeta(modelType);

    //
    // Convert inbound envelope message to model specific mutation.
    //
    const inboundTransform = createTransform<IEchoStream, ModelMessage<unknown>>(async (message: IEchoStream) => {
      const { meta, data: { itemId: mutationItemId, mutation } } = message;
      assert(mutationItemId === itemId);
      assert(mutation);
      return {
        meta,
        mutation: modelMeta.mutation.decode(mutation)
      };
    });

    //
    // Convert model-specific outbound mutation to outbound envelope message.
    //
    const outboundTransform = this._writeStream && mapFeedWriter<unknown, EchoEnvelope>(mutation => ({
      itemId,
      mutation: modelMeta.mutation.encode(mutation)
    }), this._writeStream);

    // Create the model with the outbound stream.
    const model: Model<any> = this._modelFactory.createModel(modelType, itemId, outboundTransform);
    assert(model, `Invalid model: ${modelType}`);

    // Connect the streams.
    readStream.pipe(inboundTransform).pipe(model.processor);

    if (link) {
      assert(link.source);
      assert(link.target);
    }

    //
    // Create the Item.
    //
    const item = link
      ? new Link(itemId, itemType, modelMeta, model, this._writeStream, parent, {
        sourceId: link.source!,
        targetId: link.target!,
        source: this.getItem(link.source!),
        target: this.getItem(link.target!)
      })
      : new Item(itemId, itemType, modelMeta, model, this._writeStream, parent);

    if (modelSnapshot) {
      if (model instanceof DefaultModel) {
        model.snapshot = modelSnapshot;
      } else {
        assert(modelMeta.snapshotCodec, 'Model snapshot provided but the model does not support snapshots.');
        await model.restoreFromSnapshot(modelMeta.snapshotCodec.decode(modelSnapshot));
      }
    }

    // Process initial mutations.
    if (initialMutations) {
      for (const mutation of initialMutations) {
        await item.model.processMessage(mutation.meta, modelMeta.mutation.decode(mutation.mutation));
      }
    }

    assert(!this._items.has(itemId));
    this._items.set(itemId, item);
    log('Constructed:', String(item));

    if (!(item.model instanceof DefaultModel)) {
      // Notify Item was udpated.
      // TODO(burdon): Update the item directly?
      this._itemUpdate.emit(item);

      // TODO(telackey): Unsubscribe?
      item.subscribe(() => {
        this._itemUpdate.emit(item);
      });
    }

    // Notify pending creates.
    this._pendingItems.get(itemId)?.(item);

    return item;
  }

  /**
   * Retrieves a item from the index.
   * @param itemId
   */
  getItem<M extends Model<any> = any> (itemId: ItemID): Item<M> | undefined {
    return this._items.get(itemId);
  }

  /**
   * Return matching items.
   * @param [filter]
   */
  queryItems <M extends Model<any> = any> (filter: ItemFilter = {}): ResultSet<Item<M>> {
    return new ResultSet(this._debouncedItemUpdate, () => Array.from(this._items.values())
      .filter(item =>
        !item.isLink &&
        !(item.model instanceof DefaultModel) &&
        this._matchesFilter(item, filter)
      ));
  }

  getItemsWithDefaultModels (): Item<DefaultModel>[] {
    return Array.from(this._items.values()).filter(item => item.model instanceof DefaultModel);
  }

  /**
   * Reconstruct an item with a default model when that model becomes registered.
   * New model instance is created and streams are reconnected.
   */
  async reconstructItemWithDefaultModel (itemId: ItemID, readStream: NodeJS.ReadableStream) {
    const item = this._items.get(itemId);
    assert(item);
    assert(item.model instanceof DefaultModel);

    this._items.delete(itemId);

    // Disconnect the stream.
    await pify(item.model.processor.end.bind(item.model.processor))();

    await this.constructItem({
      itemId,
      itemType: item.type,
      modelType: item.model.originalModelType,
      readStream,
      initialMutations: item.model.mutations,
      modelSnapshot: item.model.snapshot
    });
  }

  private _matchesFilter (item: Item<any>, filter: ItemFilter) {
    if (filter.type && (!item.type || !equalsOrIncludes(item.type, filter.type))) {
      return false;
    }

    if (filter.parent && (!item.parent || !equalsOrIncludes(item.parent.id, filter.parent))) {
      return false;
    }

    if (filter.id && !equalsOrIncludes(item.id, filter.id)) {
      return false;
    }

    return true;
  }
}

// TODO(burdon): Factor out.
function equalsOrIncludes<T> (value: T, expected: T | T[]) {
  if (Array.isArray(expected)) {
    return expected.includes(value);
  } else {
    return expected === value;
  }
}

/**
 * Returns a new event that groups all of the updates emitted during single tick into a single event emission.
 */
function debounceEvent (event: Event): Event {
  const debouncedEvent = new Event();

  let firing = false;

  debouncedEvent.addEffect(() => event.on(() => {
    if (!firing) {
      firing = true;
      setTimeout(() => {
        firing = false;
        debouncedEvent.emit();
      }, 0);
    }
  }));

  return debouncedEvent;
}
