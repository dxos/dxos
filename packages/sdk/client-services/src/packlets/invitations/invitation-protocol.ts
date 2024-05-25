//
// Copyright 2023 DXOS.org
//

import { type PublicKey } from '@dxos/keys';
import type { ApiError } from '@dxos/protocols';
import type { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import type { ProfileDocument, DeviceProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import type {
  AdmissionRequest,
  AdmissionResponse,
  IntroductionRequest,
} from '@dxos/protocols/proto/dxos/halo/invitations';

export interface InvitationProtocol {
  //
  // Debugging
  //

  /**
   * Protocol-specific debug info to include in logs.
   */
  toJSON(): object;

  //
  // Host
  //

  checkCanInviteNewMembers(): ApiError | undefined;

  /**
   * Protocol-specific information to include in the invitation.
   */
  getInvitationContext(): Partial<Invitation> & Pick<Invitation, 'kind'>;

  /**
   * Allow authorized peers to handle this invitation behalf of invitation creator.
   * @return id of the delegation credential written to subject control-feed.
   */
  delegate(invitation: Invitation): Promise<PublicKey>;

  /**
   * Notify other peers that a delegated invitation was cancelled;
   */
  cancelDelegation(invitation: Invitation): Promise<void>;

  /**
   * Once authentication is successful, the host can admit the guest to the requested resource.
   */
  admit(invitation: Invitation, request: AdmissionRequest, guestProfile?: ProfileDocument): Promise<AdmissionResponse>;

  //
  // Guest
  //

  /**
   * Check if the invitation is valid.
   *
   * For example, the guest may already be a member of the space.
   */
  checkInvitation(invitation: Partial<Invitation>): ApiError | undefined;

  /**
   * Get profile information to send to the host to identify the guest.
   */
  createIntroduction(): IntroductionRequest;

  /**
   * Get key information to send to the host in order to create an admission credential for the guest.
   */
  createAdmissionRequest(deviceProfile?: DeviceProfileDocument): Promise<AdmissionRequest>;

  /**
   * Redeem the admission credential.
   */
  accept(response: AdmissionResponse, request: AdmissionRequest): Promise<Partial<Invitation>>;
}
