//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { NetworkManager } from '@dxos/network-manager';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';

import { AuthenticatingInvitationObservable, CancellableInvitationObservable } from './invitations';

export type InvitationsOptions = {
  type?: Invitation.Type;
  timeout?: number;
  // Used for debugging.
  swarmKey?: PublicKey;
  /**
   * Authentication method.
   * @default AuthMethod.SHARED_SECRET
   */
  authMethod?: AuthMethod;
};

/**
 * Common interface for Halo and Space invitation proxies and handlers.
 * Handles the life-cycle of Space invitations between peers.
 *
 * Host
 * - Creates an invitation containing a swarm topic (which can be shared via a URL, QR code, or direct message).
 * - Joins the swarm with the topic and waits for guest's admission request.
 * - Wait for guest to authenticate with OTP.
 * - Waits for guest to present credentials (containing local device and feed keys).
 * - Writes credentials to control feed then exits.
 *
 * Guest
 * - Joins the swarm with the topic.
 * - Sends an admission request.
 * - Sends authentication OTP.
 * - If Space handler then creates a local cloned space (with genesis block).
 * - Sends admission credentials.
 *
 * TODO(burdon): Show proxy/service relationship and reference design doc/diagram.
 *
 *  ```
 *  [Guest]                                          [Host]
 *   |-----------------------------RequestAdmission-->|
 *   |-------------------------------[Authenticate]-->|
 *   |------------------PresentAdmissionCredentials-->|
 *  ```
 */
export interface InvitationsHandler<T = void> {
  createInvitation(context: T, options?: InvitationsOptions): CancellableInvitationObservable;
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

  abstract createInvitation(context: T, options?: InvitationsOptions): CancellableInvitationObservable;
  abstract acceptInvitation(invitation: Invitation, options?: InvitationsOptions): AuthenticatingInvitationObservable;
}
