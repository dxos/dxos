//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';
import { type Step as BaseStep } from 'react-joyride';

import { type PluginsContext } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';

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
  export class Start extends S.TaggedClass<Start>()(`${HELP_ACTION}/start`, {
    input: S.Void,
    output: S.Void,
  }) {}
}
