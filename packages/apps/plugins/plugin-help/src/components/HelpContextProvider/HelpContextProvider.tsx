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
  const [stepIndex, _setStepIndex] = useState(0);
  const setStepIndex = async (index: number, cb?: () => any) => {
    if (runningProp) {
      const step = steps[index];
      await step?.before?.({ plugins, step });
    }
    _setStepIndex(index);
    cb?.();
  };
  const setRunningChanged = (state: boolean) => {
    if (typeof runningProp !== 'undefined') {
      onRunningChanged?.(state);
    } else {
      if (state) {
        void setStepIndex(0, () => setRunning(true));
      } else {
        setRunning(false);
      }
    }
  };
  const [steps, setSteps] = useState(initialSteps);
  // const [helpers, setHelpers] = useState<StoreHelpers>();
  // const { themeMode } = useThemeContext();
  const [running, setRunning] = useState(!!runningProp);
  const { plugins } = usePlugins();
  const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);

  const paused = shellDisplay !== ShellDisplay.NONE || layoutPlugin?.provides.layout.dialogOpen;

  useEffect(() => {
    if (runningProp) {
      void setStepIndex(0, () => setRunning(true));
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
        // removeTargetClass(options.step.target);
        break;
      case EVENTS.STEP_AFTER:
        removeTargetClass(options.step.target);
        switch (action) {
          case ACTIONS.NEXT:
            if (index < size - 1) {
              void setStepIndex(index + 1);
            }
            break;
          case ACTIONS.PREV:
            if (index > 0) {
              void setStepIndex(index - 1);
            }
            break;
          case ACTIONS.CLOSE:
            setRunningChanged(false);
            void setStepIndex(0);
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
        start: async () => {
          setRunningChanged(true);
        },
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
        // spotlightClicks={true}
        // disableOverlay={true}
        // disableOverlayClose={true}
        steps={steps}
        stepIndex={stepIndex}
        run={running && !paused}
        callback={callback}
        floaterProps={floaterProps}
        tooltipComponent={Tooltip}
        // getHelpers={(helpers) => setHelpers(helpers)}
      />
      {children}
    </HelpContext.Provider>
  );
};
