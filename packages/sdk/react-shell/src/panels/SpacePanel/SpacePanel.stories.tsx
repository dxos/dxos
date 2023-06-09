//
// Copyright 2023 DXOS.org
//

import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { SpacePanel } from './SpacePanel';

export default {
  component: SpacePanel,
};

export const Default = {
  decorators: [ClientSpaceDecorator()],
};
