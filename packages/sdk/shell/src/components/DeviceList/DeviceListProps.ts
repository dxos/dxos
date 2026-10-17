//
// Copyright 2024 DXOS.org
//

import { type ConnectionState } from '@dxos/react-client/mesh';

/**
 * What {@link DeviceListItem} needs to render one device, as a structural type rather than the
 * client `Device` proxy. HALO's `Identity.DeviceInfo` satisfies it, so a consumer holding HALO
 * devices renders the item without a `@dxos/client` dependency; shell's own client-backed callers
 * map through `toShellDevice`.
 */
export type ShellDevice = {
  /** Hex-encoded device key. */
  key: string;
  kind?: 'unknown' | 'browser' | 'native' | 'mobile' | 'agent' | 'agent-managed';
  /** User-assigned name, when set. */
  label?: string;
  os?: string;
  platform?: string;
  /** Whether this is the local (current) device. */
  current: boolean;
  presence?: 'online' | 'offline' | 'removed';
};

export type DeviceListProps = {
  devices: readonly ShellDevice[];
  connectionState?: ConnectionState;
  /** The current device's menu actions; the menu shows only when one is given. */
  onClickReset?: () => void;
  onClickJoinExisting?: () => void;
  onClickRecover?: () => void;
};

export type AgentFormProps = {
  onAgentCreate: () => Promise<void>;
  onAgentDestroy: () => Promise<void>;
  onAgentRefresh: () => Promise<void>;
  agentStatus: 'getting' | 'creating' | 'destroying' | 'created' | 'creatable' | 'error';
  validationMessage: string;
  agentHostingEnabled: boolean;
};

export type DeviceListItemProps = Omit<DeviceListProps, 'devices'> & {
  device: ShellDevice;
};
