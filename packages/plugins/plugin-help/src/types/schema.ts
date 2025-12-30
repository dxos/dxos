//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import { type Context, createContext } from 'react';
import { type Step as BaseStep } from 'react-joyride';

import { type Capability } from '@dxos/app-framework';

import { meta } from '../meta';

export type Step = BaseStep & {
  before?: (context: Capability.PluginContext) => void;
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

export namespace HelpAction {
  export class Start extends Schema.TaggedClass<Start>()(`${meta.id}/action/start`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}
}
