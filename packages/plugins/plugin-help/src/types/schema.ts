//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import { type Context, createContext } from 'react';
import { type Step as BaseStep } from 'react-joyride';

import { Capability, type CapabilityManager } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { meta } from '../meta';

export type Step = BaseStep & {
  before?: (capabilities: CapabilityManager.CapabilityManager) => void;
};

export type HelpContextType = {
  running: boolean;
  steps: Step[];
  setSteps: (steps: Step[]) => void;
  setIndex: (index: number) => void;
  start: () => void;
  stop: () => void;
};

export const HelpContext: Context<HelpContextType> = createContext<HelpContextType>({
  running: false,
  steps: [],
  setSteps: () => {},
  setIndex: () => {},
  start: () => {},
  stop: () => {},
});

const HELP_OPERATION = `${meta.id}/operation`;

export namespace HelpOperation {
  export const Start = Operation.make({
    meta: { key: `${HELP_OPERATION}/start`, name: 'Start Help' },
    services: [Capability.Service],
    schema: { input: Schema.Void, output: Schema.Void },
  });
}
