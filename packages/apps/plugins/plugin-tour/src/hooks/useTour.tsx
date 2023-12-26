//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';
import type Joyride from 'react-joyride';
import { ACTIONS, EVENTS } from 'react-joyride';

export const useTour = (_running = false) => {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(_running);
  useEffect(() => setRunning(_running), [_running]);

  // https://docs.react-joyride.com/callback
  const callback: Joyride['callback'] = ({ action, type, index, size }) => {
    // console.log('handleTour', { type, action, index, size, rest });

    switch (type) {
      case EVENTS.STEP_AFTER:
        switch (action) {
          case ACTIONS.NEXT:
            if (index < size - 1) {
              setStep(index + 1);
            }
            break;
          case ACTIONS.PREV:
            if (index > 0) {
              setStep(index - 1);
            }
            break;
          case ACTIONS.CLOSE:
            setRunning(false);
            setStep(0);
            break;
        }
        break;

      case EVENTS.TOUR_END:
        setRunning(false);
        setStep(0);
        break;
    }
  };

  return { running, step, callback, start: () => setRunning(true) };
};
