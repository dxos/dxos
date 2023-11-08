//
// Copyright 2023 DXOS.org
//

import { type Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import {
  type AdmissionRequest,
  type AdmissionResponse,
  type IntroductionRequest,
} from '@dxos/protocols/proto/dxos/halo/invitations';

export interface InvitationProtocol {
  // Debugging
  toJSON(): object;

  // Host
  getInvitationContext(): Partial<Invitation> & Pick<Invitation, 'kind'>;
  admit(request: AdmissionRequest, guestProfile?: ProfileDocument): Promise<AdmissionResponse>;

  // Guest
  createIntroduction(): IntroductionRequest;
  createAdmissionRequest(): Promise<AdmissionRequest>;
  accept(response: AdmissionResponse, request: AdmissionRequest): Promise<Partial<Invitation>>;
}
