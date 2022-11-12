//
// Copyright 2022 DXOS.org
//

import { NetworkManager } from '@dxos/network-manager';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { AuthenticatingInvitationObservable, InvitationObservable } from './invitations';

export type InvitationsOptions = {
  type?: Invitation.Type;
  timeout?: number;
};

/**
 * Common interface for Halo and Space invitation proxies and handlers.
 * Handles the life-cycle of Space invitations between peers.
 *
 * Host
 * - Creates an invitation containing a swarm topic.
 * - Joins the swarm with the topic and waits for guest's admission request.
 * - Responds with admission offer then waits for guest's credentials.
 * - Writes credentials to control feed then exits.
 *
 * Guest
 * - Joins the swarm with the topic.
 * - NOTE: The topic is transmitted out-of-band (e.g., via a QR code).
 * - Sends an admission request.
 * - If Space handler then creates a local cloned space (with genesis block).
 * - Sends admission credentials (containing local device and feed keys).
 *
 * TODO(burdon): Show proxy/service relationship and reference design doc/diagram.
 *
 *  ```
 *  [Guest]                                                  [Host]
 *   |-------------------------------------RequestAdmission-->|
 *   |<--AdmissionOffer---------------------------------------|
 *   |
 *   |--------------------------PresentAdmissionCredentials-->|
 *  ```
 */
export interface InvitationsHandler<T = void> {
  createInvitation(context: T, options?: InvitationsOptions): InvitationObservable;
  acceptInvitation(invitation: Invitation, options?: InvitationsOptions): AuthenticatingInvitationObservable;
}

/**
 * Base class for Halo/Space invitations handlers.
 */
// TODO(burdon): Extract common functionality.
export abstract class AbstractInvitationsHandler<T = void> implements InvitationsHandler<T> {
  // prettier-ignore
  protected constructor(
    protected readonly _networkManager: NetworkManager
  ) {}

  abstract createInvitation(context: T, options?: InvitationsOptions): InvitationObservable;
  abstract acceptInvitation(invitation: Invitation, options?: InvitationsOptions): AuthenticatingInvitationObservable;
}
