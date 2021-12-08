//
// Copyright 2021 DXOS.org
//

import { Codec } from '@dxos/codec-protobuf';
import { FeedWriter, MutationMeta, WriteReceipt } from '@dxos/echo-protocol';

export type DXN = string; // TODO(burdon): Move.

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
 * TODO(burdon): Set state from snapshot? Combine with SnapshotHandler?
 */
export interface StateMachine<STATE, MUTATION> extends StateProvider<STATE> {
  processMutation: (mutation: MUTATION, meta: MutationMeta) => boolean
}

/**
 * Serializes and deserializes models to and from immutable snapshots.
 * Enables epochs and periodic in-memory snapshots for rollback.
 * TODO(burdon): Deleted items (dropped by model during snapshot write).
 * TODO(burdon): Ref https://stackoverflow.com/questions/4929243/clarifying-terminology-what-does-hydrating-a-jpa-or-hibernate-entity-mean-wh
 */
export interface SnapshotHandler<STATE, SNAPSHOT> {
  toSnapshot: (state: STATE) => SNAPSHOT
  fromSnapshot: (snapshot: SNAPSHOT) => STATE
}

/**
 * Provides an application-specific API for updating state machines.
 * NOTE: The model is not able to modify the state directly.
 * TODO(burdon): Create initial state (i.e., Model.getInitMutation)?
 */
export interface ExperimentalModel<STATE, MUTATION> {
  writeMutation: (mutation: MUTATION) => Promise<WriteReceipt>
}

/**
 * Runtime model specification.
 * Enables the instantiation of models from the Item genesis message: { ItemID, ItemType, ModelType }.
 */
export interface ModelSpec<STATE, MUTATION, SNAPSHOT> {
  type: DXN
  mutationCodec: Codec<MUTATION>
  snapshotCodec?: Codec<SNAPSHOT>
  stateMachine: StateMachine<STATE, MUTATION>
  snapshotHandler?: SnapshotHandler<STATE, SNAPSHOT>
  modelFactory: (writeStream: FeedWriter<MUTATION>) => ExperimentalModel<STATE, MUTATION>
}

/**
 * Base class for models.
 */
export abstract class AbstractModel<STATE, MUTATION> implements ExperimentalModel<STATE, MUTATION>{
  protected constructor (
    private readonly _stateProvider: StateProvider<STATE>,
    private readonly _writeStream: FeedWriter<MUTATION> // TODO(burdon): Allow read-only?
  ) {}

  protected get state () {
    return this._stateProvider.getState();
  }

  async writeMutation (mutation: MUTATION) {
    return this._writeStream.write(mutation);
  }
}

//
// TODO(burdon): Tests.
//

class TestStateMachine implements StateMachine<number, number> {
  private state: number = 0;

  getState (): number {
    return this.state;
  }

  processMutation (mutation: number, meta: MutationMeta) {
    this.state += mutation;
    return true;
  }
}

class TestModel extends AbstractModel<number, number> {
  get count () {
    return super.state;
  }

  async inc () {
    return super.writeMutation(1);
  }
}
