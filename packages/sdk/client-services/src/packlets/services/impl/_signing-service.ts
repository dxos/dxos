//
// Copyright 2022 DXOS.org
//

import { KeyRecord, SigningService, SignRequest, SignResponse } from '@dxos/protocols/proto/dxos/client/services';

/**
 *
 */
export class SigningServiceImpl implements SigningService {
  async updateKeyRecord(keyRecord: KeyRecord) {
    throw new Error();
  }

  async sign(request: SignRequest): Promise<SignResponse> {
    throw new Error();
  }
}
