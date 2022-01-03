import { InvitationDescriptor } from "@dxos/echo-db";

/**
 * Represents an invitation that was created.
 */
export class InvitationRequest {
  constructor(
    private readonly _descriptor: InvitationDescriptor,
    private readonly _secret: Buffer | undefined,
  ) {}

  get descriptor(): InvitationDescriptor {
    return this._descriptor;
  }

  get secret (): Buffer | undefined {
    return this._secret;
  }
}