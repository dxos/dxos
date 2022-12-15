import { Event, synchronized } from "@dxos/async";
import { AcceptSpaceOptions, DataServiceSubscriptions, MetadataStore, SpaceManager } from "@dxos/echo-db";
import { PublicKey } from "@dxos/keys";
import { ComplexMap } from "@dxos/util";
import { DataSpace } from "./data-space";

export class DataSpaceManager {
  public readonly updated = new Event();

  private readonly _spaces = new ComplexMap<PublicKey, DataSpace>(PublicKey.hash);

  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _metadataStore: MetadataStore,
    private readonly _dataServiceSubscriptions: DataServiceSubscriptions,
  ) { }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open() {
    await this._metadataStore.load();

    for (const spaceMetadata of this._metadataStore.spaces) {
      const space = await this._spaceManager.constructSpace(spaceMetadata);
      await space.open();
      const dataSpace = new DataSpace(space);
      this._dataServiceSubscriptions.registerSpace(space.key, space.database!.createDataServiceHost());
      this._spaces.set(spaceMetadata.key, dataSpace);
    }
  }

  @synchronized
  async close() {

  }

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  async createSpace() {
    const space = await this._spaceManager.createSpace();
    const dataSpace = new DataSpace(space);
    this._spaces.set(dataSpace.key, dataSpace);
    this._dataServiceSubscriptions.registerSpace(space.key, space.database!.createDataServiceHost());
    this.updated.emit();
    return dataSpace;
  }

  // TODO(burdon): Rename join space.
  async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
    const space = await this._spaceManager.acceptSpace(opts);
    const dataSpace = new DataSpace(space);
    this._spaces.set(dataSpace.key, dataSpace);
    this._dataServiceSubscriptions.registerSpace(space.key, space.database!.createDataServiceHost());
    this.updated.emit();
    return dataSpace;
  }
}