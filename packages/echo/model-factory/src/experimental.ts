//
// Copyright 2021 DXOS.org
//

import { Codec } from '@dxos/codec-protobuf';
import { FeedWriter, ItemID, ItemType, MutationMeta, WriteReceipt } from '@dxos/echo-protocol';

// TODO(burdon): Move.
export type DXN = string;

// TODO(burdon): Protobuf.
interface ItemGenesis {
  itemId: ItemID
  itemType: ItemType
  modelType: DXN
}

// TODO(burdon): Adapted from braneframe ExperimentalChessModel.stories.tsx
// TODO(burdon): Separate aspects to isolate stateful and stateless (pure) methods.
// TODO(burdon): Create interface for legacy Model and start to factor out aspects.

/**
 * Provides an immutable state reference.
 */
export interface StateProvider<STATE> {
  getState: () => STATE
}

/**
 * Processes mutation messages that modify the model's state.
 * Serializes and deserializes models to and from immutable snapshots.
 * Enables epochs and periodic in-memory snapshots for rollback.
 * TODO(burdon): Deleted items (dropped by model during snapshot write).
 * TODO(burdon): Ref https://stackoverflow.com/questions/4929243/clarifying-terminology-what-does-hydrating-a-jpa-or-hibernate-entity-mean-wh
 */
export interface StateMachine<STATE, MUTATION, SNAPSHOT> extends StateProvider<STATE> {
  processMutation: (mutation: MUTATION, meta: MutationMeta) => boolean
  fromSnapshot: (snapshot: SNAPSHOT) => void
  toSnapshot: () => SNAPSHOT
}

/**
 * Provides application-specific API for accessing and updating state machines.
 * NOTE: The model is not able to modify the state directly.
 * TODO(burdon): Create initial state (i.e., Model.getInitMutation)?
 */
export interface ExperimentalModel<STATE, MUTATION> {
  writeMutation: (mutation: MUTATION) => Promise<WriteReceipt>
}

/**
 * Base class for models.
 */
export abstract class AbstractModel<STATE, MUTATION> implements ExperimentalModel<STATE, MUTATION> {
  protected constructor (
    private readonly _stateProvider: StateProvider<STATE>,
    private readonly _writeStream?: FeedWriter<MUTATION>
  ) {}

  get readonly () {
    return !!this._writeStream;
  }

  get state () {
    return this._stateProvider.getState();
  }

  async writeMutation (mutation: MUTATION) {
    return this._writeStream!.write(mutation);
  }
}

/**
 * Runtime model specification.
 * Enables the instantiation of models from the Item genesis message: { ItemID, ItemType, ModelType }.
 */
export interface ModelSpec<STATE, MUTATION, SNAPSHOT> {
  type: DXN
  mutationCodec: Codec<MUTATION>
  snapshotCodec: Codec<SNAPSHOT>
  stateMachineFactory: () => StateMachine<STATE, MUTATION, SNAPSHOT>
  modelFactory: (stateProvider: StateProvider<STATE>, writeStream?: FeedWriter<MUTATION>) => ExperimentalModel<STATE, MUTATION>
}

export interface IModelRegistry {
  register: (spec: ModelSpec<any, any, any>) => void
  createModel: (itemGenesis: ItemGenesis) => ExperimentalModel<any, any>
}

class ModelRegistry implements IModelRegistry {
  private _specs = new Map<DXN, ModelSpec<any, any, any>>();

  register (spec: ModelSpec<any, any, any>): void {
    this._specs.set(spec.type, spec);
  }

  createModel (itemGenesis: ItemGenesis): ExperimentalModel<any, any> {
    const { modelType } = itemGenesis;
    const spec = this._specs.get(modelType)!;
    const stateMachine = spec.stateMachineFactory();
    return spec.modelFactory(stateMachine);
  }
}

//
// TODO(burdon): Create more realistic tests.
//

type TestState = { value: number }
type TestMutation = { increment: number }
type TestSnapshot = number

class TestStateMachine implements StateMachine<TestState, TestMutation, TestSnapshot> {
  private state: TestState = { value: 0 };

  getState (): TestState {
    return this.state;
  }

  processMutation (mutation: TestMutation, meta: MutationMeta) {
    this.state.value += mutation.increment;
    return true;
  }

  fromSnapshot (snapshot: TestSnapshot): void {
    this.state.value = snapshot;
  }

  toSnapshot (): TestSnapshot {
    return this.state.value;
  }
}

class TestModel extends AbstractModel<TestState, TestMutation> {
  get count () {
    return super.state;
  }

  async inc () {
    return super.writeMutation({ increment: 1 });
  }
}

// const item: Item<TestModel> = undefined;
