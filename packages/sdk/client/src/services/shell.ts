//
// Copyright 2023 DXOS.org
//

import type { MulticastObservable } from '@dxos/async';
import { type PublicKey } from '@dxos/keys';
import { type LayoutRequest, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { ComplexSet } from '@dxos/util';

import type { ShellManager } from './shell-manager';
import type { Space, SpaceMember } from '../echo';
import type { Device, Identity } from '../halo';

type ShellResult = {
  cancelled: boolean;
  error?: Error;
};

type InitializeIdentityResult = ShellResult & {
  identity?: Identity;
};

type ShareIdentityResult = ShellResult & {
  device?: Device;
};

type ShareSpaceResult = ShellResult & {
  members?: SpaceMember[];
};

type JoinSpaceResult = ShellResult & {
  space?: Space;
  target?: string;
};

type ShellParams = {
  shellManager: ShellManager;
  identity: MulticastObservable<Identity | null>;
  devices: MulticastObservable<Device[]>;
  spaces: MulticastObservable<Space[]>;
};

/**
 * Interface for controlling the shell.
 */
export class Shell {
  private readonly _shellManager: ShellManager;
  private readonly _identity: MulticastObservable<Identity | null>;
  private readonly _devices: MulticastObservable<Device[]>;
  private readonly _spaces: MulticastObservable<Space[]>;

  constructor({ shellManager, identity, devices, spaces }: ShellParams) {
    this._shellManager = shellManager;
    this._identity = identity;
    this._devices = devices;
    this._spaces = spaces;
  }

  async setInvitationUrl(request: {
    invitationUrl: string;
    deviceInvitationParam: string;
    spaceInvitationParam: string;
  }) {
    await this._shellManager.setInvitationUrl(request);
  }

  /**
   * Open the shell with the given layout.
   */
  async open(layout: ShellLayout = ShellLayout.IDENTITY, options: Omit<LayoutRequest, 'layout'> = {}): Promise<void> {
    await this._shellManager.setLayout({ layout, ...options });
  }

  /**
   * Create a new identity.
   * Opens the shell and starts the identity creation flow based on the given options.
   *
   * @param options.invitationCode If provided, join an existing identity via device invitation.
   *
   * @returns Shell result with the new identity.
   */
  async initializeIdentity({ invitationCode }: { invitationCode?: string } = {}): Promise<InitializeIdentityResult> {
    await this._shellManager.setLayout({ layout: ShellLayout.INITIALIZE_IDENTITY, invitationCode });
    return new Promise((resolve) => {
      this._shellManager.contextUpdate.on((context) => {
        if (context.display === ShellDisplay.NONE) {
          resolve({ cancelled: true });
        }
      });

      this._identity.subscribe((identity) => {
        if (identity) {
          resolve({ identity, cancelled: false });
        }
      });
    });
  }

  /**
   * Invite a new device to join the current identity.
   * Opens the shell and presents a device invitation.
   *
   * @returns Shell result with the new device.
   */
  async shareIdentity(): Promise<ShareIdentityResult> {
    if (!this._identity.get()) {
      return { error: new Error('Identity does not exist'), cancelled: false };
    }

    const initialDevices = new ComplexSet<PublicKey>(
      (key) => key.toHex(),
      this._devices.get().map((device) => device.deviceKey),
    );
    await this._shellManager.setLayout({ layout: ShellLayout.SHARE_IDENTITY });
    return new Promise((resolve) => {
      this._shellManager.contextUpdate.on((context) => {
        if (context.display === ShellDisplay.NONE) {
          const device = this._devices.get().find((device) => !initialDevices.has(device.deviceKey));
          resolve({ device, cancelled: !device });
        }
      });
    });
  }

  /**
   * Invite new members to join the current space.
   * Opens the shell to the specified space, showing current members and allowing new members to be invited.
   *
   * @param options.spaceKey The space to share.
   * @param options.target The target location to share with new members.
   *
   * @returns Shell result with any new members that join while the shell is open.
   */
  async shareSpace({ spaceKey, target }: { spaceKey: PublicKey; target?: string }): Promise<ShareSpaceResult> {
    if (!this._identity.get()) {
      return { error: new Error('Identity does not exist'), cancelled: false };
    }

    const space = this._spaces.get().find((space) => space.key.equals(spaceKey));
    if (!space) {
      return { error: new Error('Space does not exist'), cancelled: false };
    }

    const initialMembers = new ComplexSet<PublicKey>(
      (key) => key.toHex(),
      space.members.get().map((member) => member.identity.identityKey),
    );
    await this._shellManager.setLayout({ layout: ShellLayout.SPACE, spaceKey, target });
    return new Promise((resolve) => {
      this._shellManager.contextUpdate.on((context) => {
        if (context.display === ShellDisplay.NONE) {
          const members = space.members.get().filter((member) => !initialMembers.has(member.identity.identityKey));
          resolve({ members, cancelled: members.length === 0 });
        }
      });
    });
  }

  /**
   * Join an existing space.
   * Opens the shell and starts the space join flow based on the given options.
   *
   * @param options.invitationCode If provided, redeem the invitation code to join the space.
   *
   * @returns The joined space.
   * @throws {Error} If no identity exists.
   */
  async joinSpace({ invitationCode }: { invitationCode?: string } = {}): Promise<JoinSpaceResult> {
    if (!this._identity.get()) {
      return { error: new Error('Identity does not exist'), cancelled: false };
    }

    await this._shellManager.setLayout({ layout: ShellLayout.JOIN_SPACE, invitationCode });
    return new Promise((resolve) => {
      this._shellManager.contextUpdate.on((context) => {
        const space = context.spaceKey && this._spaces.get().find((space) => context.spaceKey?.equals(space.key));
        if (space) {
          resolve({ space, target: context.target, cancelled: false });
        }

        if (context.display === ShellDisplay.NONE) {
          resolve({ cancelled: true });
        }
      });
    });
  }
}
