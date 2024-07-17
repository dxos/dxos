//
// Copyright 2023 DXOS.org
//

import React, { type PropsWithChildren, useState, useEffect } from 'react';
import Joyride, { ACTIONS, EVENTS } from 'react-joyride';

import { usePlugins, resolvePlugin, parseLayoutPlugin } from '@dxos/app-framework';
import { useShellDisplay, ShellDisplay } from '@dxos/react-client';
// import { useThemeContext } from '@dxos/react-ui';
import { tailwindConfig, type TailwindConfig } from '@dxos/react-ui-theme';

import { type Step, HelpContext } from '../../types';
import { floaterProps, Tooltip } from '../Tooltip';

export const tokens: TailwindConfig['theme'] = tailwindConfig({}).theme;

const addStepClass = (target: string | HTMLElement) => {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (element) {
    element.classList.add('joyride-target');
  }
};

const removeTargetClass = (target: string | HTMLElement) => {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (element) {
    element.classList.remove('joyride-target');
  }
};

export const HelpContextProvider = ({
  children,
  steps: initialSteps,
  running: runningProp,
  onRunningChanged,
}: PropsWithChildren<{ steps: Step[]; running?: boolean; onRunningChanged?: (state: boolean) => any }>) => {
  const shellDisplay = useShellDisplay();
  const { plugins } = usePlugins();
  const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
  const [running, setRunning] = useState(!!runningProp);
  const [stepIndex, _setStepIndex] = useState(0);
  const [steps, setSteps] = useState(initialSteps);

  const paused = shellDisplay !== ShellDisplay.NONE || layoutPlugin?.provides.layout.dialogOpen;

  const setStepIndex = (index: number) => {
    if (runningProp) {
      const step = steps[index];
      step?.before?.({ plugins, step });
    }
    _setStepIndex(index);
  };

  const setRunningChanged = (state: boolean) => {
    if (typeof runningProp !== 'undefined') {
      onRunningChanged?.(state);
    } else {
      if (state) {
        setStepIndex(0);
        setRunning(true);
      } else {
        setRunning(false);
      }
    }
  };

  useEffect(() => {
    if (runningProp) {
      setStepIndex(0);
      setRunning(true);
    } else if (typeof runningProp !== 'undefined') {
      setRunning(false);
    }
  }, [runningProp]);

  // https://docs.react-joyride.com/callback
  const callback: Joyride['callback'] = async (options) => {
    const { type, action, index, size } = options;
    switch (type) {
      case EVENTS.STEP_BEFORE:
        addStepClass(options.step.target);
        break;
      case EVENTS.TOUR_END:
        break;
      case EVENTS.STEP_AFTER:
        removeTargetClass(options.step.target);
        switch (action) {
          case ACTIONS.NEXT:
            if (index < size - 1) {
              setStepIndex(index + 1);
            }
            break;
          case ACTIONS.PREV:
            if (index > 0) {
              setStepIndex(index - 1);
            }
            break;
          case ACTIONS.CLOSE:
            setRunningChanged(false);
            setStepIndex(0);
            break;
        }
        break;
    }
  };

  return (
    <HelpContext.Provider
      value={{
        running: running && !paused,
        steps,
        setSteps,
        setIndex: setStepIndex,
        start: () => setRunningChanged(true),
        stop: () => setRunningChanged(false),
      }}
    >
      <style>
        {`.joyride-target {
          --controls-opacity: 1;
        }`}
      </style>
      <Joyride
        continuous={true}
        steps={steps}
        stepIndex={stepIndex}
        run={running && !paused}
        callback={callback}
        floaterProps={floaterProps}
        tooltipComponent={Tooltip}
      />
      {children}
    </HelpContext.Provider>
  );
};
