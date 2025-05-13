//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';
import { type Context, createContext } from 'react';
import { type Step as BaseStep } from 'react-joyride';

import { type PluginsContext } from '@dxos/app-framework';

import { HELP_PLUGIN } from './meta';

export type Step = BaseStep & {
  before?: (context: PluginsContext) => void;
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

export const HELP_ACTION = `${HELP_PLUGIN}/action`;
export namespace HelpAction {
  export class Start extends Schema.TaggedClass<Start>()(`${HELP_ACTION}/start`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}
}
