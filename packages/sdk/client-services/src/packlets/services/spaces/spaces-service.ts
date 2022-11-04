//
// Copyright 2022 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import {
  QueryMembersRequest,
  QueryMembersResponse,
  Space,
  SpacesService
} from '@dxos/protocols/proto/dxos/client/services';

/**
 *
 */
export class SpacesServiceImpl implements SpacesService {
  async createSpace(request: void): Promise<Space> {
    throw new Error();
  }

  querySpaces(request: void): Stream<Space> {
    throw new Error();
  }

  queryMembers(request: QueryMembersRequest): Stream<QueryMembersResponse> {
    throw new Error();
  }
}
