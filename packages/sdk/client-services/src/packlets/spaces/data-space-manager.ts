import { Event } from "@dxos/async";
import { AcceptSpaceOptions, SpaceManager } from "@dxos/echo-db";
import { PublicKey } from "@dxos/keys";
import { ComplexMap } from "@dxos/util";
import { DataSpace } from "./data-space";

export class DataSpaceManager {
  public readonly updated = new Event();

  private readonly _spaces = new ComplexMap<PublicKey, DataSpace>(PublicKey.hash);

  constructor(
    private readonly _spaceManager: SpaceManager,
  ) { }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  async createSpace() {
    const space = await this._spaceManager.createSpace();
    const dataSpace = new DataSpace(space);
    this._spaces.set(dataSpace.key, dataSpace);
    this.updated.emit();
    return dataSpace;
  }

  // TODO(burdon): Rename join space.
  async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
    const space = await this._spaceManager.acceptSpace(opts);
    const dataSpace = new DataSpace(space);
    this._spaces.set(dataSpace.key, dataSpace);
    this.updated.emit();
    return dataSpace;
  }
}