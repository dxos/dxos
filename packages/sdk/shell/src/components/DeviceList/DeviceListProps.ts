//
// Copyright 2024 DXOS.org
//

import { type SpaceMember } from '@dxos/react-client/echo';
import { type Device } from '@dxos/react-client/halo';

export type DeviceListProps = {
  devices: Device[];
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
  onClickAdd?: () => void;
  onClickEdit?: () => void;
  onClickReset?: () => void;
  onClickJoinExisting?: () => void;
};
