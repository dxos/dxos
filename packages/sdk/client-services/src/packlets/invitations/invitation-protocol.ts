//
// Copyright 2023 DXOS.org
//

import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AdmissionRequest, AdmissionResponse, IntroductionRequest } from '@dxos/protocols/proto/dxos/halo/invitations';

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
