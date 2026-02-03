//
// Copyright 2025 DXOS.org
//

import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import { Trigger, sleep } from '@dxos/async';
import { type LogProcessor, log } from '@dxos/log';

export type PanelType = number | 'identity' | 'devices' | 'spaces' | 'join';

/**
 * Test manager for invitation flows using testing-library.
 * Replaces Playwright-based InvitationsManager for Storybook Vitest tests.
 */
export class InvitationsTestManager {
  private _invitationCodeTrigger = new Trigger<string>();
  private _authCodeTrigger = new Trigger<string>();
  private _removeProcessor?: () => void;

  /**
   * Start capturing log output for invitation codes.
   */
  private _startCapture(): void {
    // Clean up previous processor if any.
    this._removeProcessor?.();

    // Reset triggers.
    this._invitationCodeTrigger = new Trigger<string>();
    this._authCodeTrigger = new Trigger<string>();

    // Add log processor to capture invitation codes.
    const self = this;
    const processor: LogProcessor = (_config, entry) => {
      // Check for invitation code in the log message.
      const message = entry.message;
      if (typeof message === 'string') {
        try {
          // Try to find JSON with invitationCode.
          const jsonMatch = message.match(/\{[^}]*"invitationCode"[^}]*\}/);
          if (jsonMatch) {
            const json = JSON.parse(jsonMatch[0]);
            if (json.invitationCode) {
              self._invitationCodeTrigger.wake(json.invitationCode);
            }
            if (json.authCode) {
              self._authCodeTrigger.wake(json.authCode);
            }
          }
        } catch {
          // Ignore parsing errors.
        }
      }
    };

    this._removeProcessor = log.addProcessor(processor);
  }

  /**
   * Get the container element for a peer.
   */
  peer(id: number) {
    return within(screen.getByTestId(`peer-${id}`));
  }

  /**
   * Wait for all peers to be visible.
   */
  async waitForPeers(count: number = 3, timeout: number = 30000): Promise<void> {
    await waitFor(
      () => {
        const headers = screen.getAllByTestId('invitations.identity-header');
        if (headers.length < count) {
          throw new Error(`Expected ${count} peers, found ${headers.length}`);
        }
      },
      { timeout },
    );
  }

  /**
   * Get the display name for a peer.
   */
  async getDisplayName(id: number): Promise<string | null> {
    const peer = this.peer(id);
    try {
      const item = peer.getByTestId('identity-list-item');
      // Extract trimmed text content, removing extra whitespace.
      return item.textContent?.trim().replace(/\s+/g, ' ') ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Wait for display name to appear on a peer.
   */
  async waitForDisplayName(id: number, timeout: number = 15000): Promise<string> {
    let displayName: string | null = null;
    await waitFor(
      async () => {
        displayName = await this.getDisplayName(id);
        if (!displayName) {
          throw new Error('Display name not found');
        }
      },
      { timeout },
    );
    return displayName!;
  }

  /**
   * Get the space name at a given index for a peer.
   */
  async getSpaceName(id: number, nth: number): Promise<string | null> {
    const peer = this.peer(id);
    try {
      const items = peer.getAllByTestId('space-list-item');
      // Extract trimmed text content.
      return items[nth]?.textContent?.trim().replace(/\s+/g, ' ') ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get the number of members in the currently open space panel.
   */
  async getSpaceMembersCount(id: number): Promise<number> {
    const peer = this.peer(id);
    try {
      const membersList = peer.getByTestId('space-members-list');
      const items = membersList.querySelectorAll('li');
      return items.length;
    } catch {
      return 0;
    }
  }

  /**
   * Wait for space at index to appear and return its name.
   */
  async waitForSpaceName(id: number, nth: number, timeout: number = 15000): Promise<string> {
    let spaceName: string | null = null;
    await waitFor(
      async () => {
        spaceName = await this.getSpaceName(id, nth);
        if (!spaceName) {
          throw new Error(`Space at index ${nth} not found`);
        }
      },
      { timeout },
    );
    return spaceName!;
  }

  /**
   * Wait for a space with the given name to appear on a peer.
   */
  async waitForSpaceToAppear(id: number, expectedName: string, timeout: number = 15000): Promise<void> {
    const peer = this.peer(id);
    // Extract just the name part (after emoji prefix) for comparison.
    const normalizedExpected = expectedName.replace(/^[^\w]+/, '').trim();

    await waitFor(
      () => {
        try {
          const items = peer.getAllByTestId('space-list-item');
          const found = items.some((item) => {
            const name = item.textContent?.trim().replace(/\s+/g, ' ') ?? '';
            const normalizedActual = name.replace(/^[^\w]+/, '').trim();
            return normalizedActual === normalizedExpected;
          });
          if (!found) {
            throw new Error(`Space "${normalizedExpected}" not found on peer ${id}`);
          }
        } catch {
          throw new Error(`Space "${normalizedExpected}" not found on peer ${id}`);
        }
      },
      { timeout },
    );
  }

  /**
   * Wait for and get the auth code for the most recent invitation.
   */
  async getAuthCode(timeout: number = 10000): Promise<string> {
    return this._authCodeTrigger.wait({ timeout });
  }

  /**
   * Create an identity for a peer.
   */
  async createIdentity(id: number): Promise<void> {
    const peer = this.peer(id);
    const createButton = peer.getByTestId('invitations.create-identity');
    fireEvent.click(createButton);

    // Wait for identity list item to appear.
    await waitFor(() => {
      peer.getByTestId('identity-list-item');
    });

    // Wait for default space to be created and ready.
    // This prevents "Feed closed" errors from async space creation during cleanup.
    await waitFor(() => {
      const items = peer.queryAllByTestId('space-list-item');
      if (items.length === 0) {
        throw new Error('Default space not yet created');
      }
    });
  }

  /**
   * Create a space for a peer.
   */
  async createSpace(id: number): Promise<void> {
    const peer = this.peer(id);
    fireEvent.click(peer.getByTestId('invitations.create-space'));

    // Wait for space to appear in list.
    await waitFor(() => {
      peer.getByTestId('space-list-item');
    });
  }

  /**
   * Open a panel for a peer.
   */
  async openPanel(id: number, panel: PanelType): Promise<void> {
    const peer = this.peer(id);

    if (typeof panel === 'number') {
      // Click on a specific space to select it.
      // This sets up the `peer${id}CreateSpaceInvitation` function.
      await waitFor(() => {
        const items = peer.getAllByTestId('space-list-item');
        if (items.length <= panel) {
          throw new Error(`Space at index ${panel} not found`);
        }
      });
      const items = peer.getAllByTestId('space-list-item');
      fireEvent.click(items[panel]);
      // TODO(wittjosiah): Wait for panel state to update after clicking space list item.
      await sleep(500);
      return;
    }

    switch (panel) {
      case 'identity':
        fireEvent.click(peer.getByTestId('invitations.open-join-identity'));
        break;
      case 'devices':
        fireEvent.click(peer.getByTestId('invitations.open-devices'));
        // Wait for devices panel to render.
        await waitFor(() => {
          peer.getByTestId('devices-panel.create-invitation');
        });
        break;
      case 'spaces':
        fireEvent.click(peer.getByTestId('invitations.list-spaces'));
        break;
      case 'join':
        fireEvent.click(peer.getByTestId('invitations.open-join-space'));
        // Wait for join panel to render.
        await waitFor(() => {
          peer.getByTestId('space-invitation-input');
        });
        break;
    }
  }

  /**
   * Create an invitation via the UI or programmatic API.
   */
  async createInvitation(
    id: number,
    type: 'device' | 'space',
    options?: { authMethod?: number; timeout?: number },
  ): Promise<string> {
    // Start capturing log output for invitation codes.
    this._startCapture();

    const peer = this.peer(id);

    if (type === 'space') {
      // TODO(wittjosiah): Update to use the UI.
      // Always use programmatic API for space invitations.
      // The UI approach with poppers is flaky in browser tests.
      (window as any)[`peer${id}CreateSpaceInvitation`](options);
    } else if (options) {
      // Use programmatic API for device invitations with options.
      (window as any)[`peer${id}CreateHaloInvitation`](options);
    } else {
      // Use UI to create device invitation.
      fireEvent.click(peer.getByTestId('devices-panel.create-invitation'));
    }

    // Wait for invitation code from log capture.
    return this._invitationCodeTrigger.wait({ timeout: 10000 });
  }

  /**
   * Accept an invitation as a guest.
   */
  async acceptInvitation(id: number, type: 'device' | 'space', invitationCode: string): Promise<void> {
    const peer = this.peer(id);
    const testIdPrefix = type === 'device' ? 'halo' : 'space';

    if (type === 'device') {
      fireEvent.click(peer.getByTestId('identity-chooser.join-identity'));
    }

    // Wait for input to be visible.
    await waitFor(() => {
      peer.getByTestId(`${testIdPrefix}-invitation-input`);
    });

    const input = peer.getByTestId(`${testIdPrefix}-invitation-input`);
    fireEvent.change(input, { target: { value: invitationCode } });
    fireEvent.click(peer.getByTestId(`${testIdPrefix}-invitation-input-continue`));
  }

  /**
   * Wait for the authenticator to be ready.
   */
  async readyToAuthenticate(type: 'device' | 'space', id: number, timeout: number = 5000): Promise<boolean> {
    const peer = this.peer(id);
    const testIdPrefix = type === 'device' ? 'halo' : 'space';

    try {
      await waitFor(
        () => {
          const input = peer.getByTestId(`${testIdPrefix}-auth-code-input`);
          if (input.hasAttribute('disabled')) {
            throw new Error('Auth code input is disabled');
          }
        },
        { timeout },
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Authenticate an invitation with an auth code.
   */
  async authenticateInvitation(type: 'device' | 'space', authCode: string, id: number): Promise<void> {
    const peer = this.peer(id);
    const testIdPrefix = type === 'device' ? 'halo' : 'space';

    const input = peer.getByTestId(`${testIdPrefix}-auth-code-input`);
    const button = peer.getByTestId(`${testIdPrefix}-invitation-authenticator-next`);

    fireEvent.change(input, { target: { value: authCode } });

    // TODO(wittjosiah): The InvitationAuthenticator component uses local React state (useState) for the auth code.
    //   fireEvent.change triggers setAuthCode but React state updates are async. Without this delay, the click
    //   handler would use the stale state value. Consider using userEvent from @testing-library/user-event instead.
    await sleep(50);

    fireEvent.click(button);
  }

  /**
   * Check if invitation has failed.
   */
  async invitationFailed(id: number, timeout: number = 3000): Promise<boolean> {
    const peer = this.peer(id);
    try {
      await waitFor(
        () => {
          const resetButton = peer.getByTestId('invitation-rescuer-reset');
          if (resetButton.hasAttribute('disabled')) {
            throw new Error('Reset button is disabled');
          }
        },
        { timeout },
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if authenticator is visible.
   */
  async authenticatorIsVisible(type: 'device' | 'space', id: number): Promise<boolean> {
    const peer = this.peer(id);
    const testIdPrefix = type === 'device' ? 'halo' : 'space';
    try {
      peer.getByTestId(`${testIdPrefix}-auth-code-input`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for the auth input to be ready for a retry after a failed attempt.
   */
  async waitForAuthRetry(type: 'device' | 'space', id: number, timeout: number = 10000): Promise<void> {
    const peer = this.peer(id);
    const testIdPrefix = type === 'device' ? 'halo' : 'space';

    // Wait for the authenticator to be ready - input should be enabled and button should be visible.
    await waitFor(
      () => {
        const input = peer.getByTestId(`${testIdPrefix}-auth-code-input`);
        const button = peer.getByTestId(`${testIdPrefix}-invitation-authenticator-next`);

        // Check that input is enabled.
        if (input.hasAttribute('disabled')) {
          throw new Error('Auth code input is still disabled');
        }

        // Check that button is enabled.
        if (button.hasAttribute('disabled')) {
          throw new Error('Next button is still disabled');
        }
      },
      { timeout },
    );
  }

  /**
   * Clear the auth code input.
   */
  async clearAuthCode(type: 'device' | 'space', id: number): Promise<void> {
    const peer = this.peer(id);
    const testIdPrefix = type === 'device' ? 'halo' : 'space';
    const input = peer.getByTestId(`${testIdPrefix}-auth-code-input`);
    fireEvent.change(input, { target: { value: '' } });
    input.focus();
  }
}
