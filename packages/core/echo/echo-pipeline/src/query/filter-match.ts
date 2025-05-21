import { QueryAST, type ObjectStructure } from '@dxos/echo-protocol';
import type { ObjectId, SpaceId } from '@dxos/keys';

export type MatchedObject = {
  id: ObjectId;
  spaceId: SpaceId;
  doc: ObjectStructure;
};

export const filterMatch = (filter: QueryAST.Filter, obj: MatchedObject) => {
  return true;
};
