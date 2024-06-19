//
// Copyright 2024 DXOS.org
//

import { type SpaceMember } from '@dxos/react-client/echo';
import { type Device } from '@dxos/react-client/halo';
import { type ConnectionState } from '@dxos/react-client/mesh';

export type DeviceListProps = {
  devices: Device[];
  connectionState?: ConnectionState;
  onClickAdd?: () => void;
  onClickEdit?: (device: Device) => void;
  onClickReset?: () => void;
  onClickJoinExisting?: () => void;
};

export type AgentFormProps = {
  onAgentCreate?: () => Promise<void>;
  onAgentDestroy?: () => Promise<void>;
  agentStatus?: string;
  agentActive?: boolean;
  agentProviderDisabled?: boolean;
  validationMessage?: string;
  agentHostingEnabled?: boolean;
};

export type DeviceListItemProps = {
  device: Device;
  presence?: SpaceMember['presence'];
  connectionState?: ConnectionState;
  onClickAdd?: () => void;
  onClickEdit?: () => void;
  onClickReset?: () => void;
  onClickJoinExisting?: () => void;
};
