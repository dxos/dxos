//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';
import { type Step } from 'react-joyride';

import { type GraphBuilderProvides, type IntentResolverProvides } from '@dxos/app-framework';

import { HELP_PLUGIN } from './meta';

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

export type HelpPluginProvides = GraphBuilderProvides & IntentResolverProvides;

const HELP_ACTION = `${HELP_PLUGIN}/action`;
export enum HelpAction {
  START = `${HELP_ACTION}/start`,
}
