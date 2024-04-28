import { Resource } from '@dxos/context';
import { LevelDB } from '@dxos/echo-pipeline';

export type EchoHostParams = {
  db: LevelDB;
};

export class EchoHost extends Resource {
  // private readonly _indexMetadataStore: 

  constructor({ db }: EchoHostParams) {
    super();
  }
}
