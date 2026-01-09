//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

export enum LoadingState {
  Loading = 0,
  FadeIn = 1,
  FadeOut = 2,
  Done = 3,
}

/**
 * To avoid "flashing" the placeholder, we wait a period of time before starting the loading animation.
 * If loading completes during this time the placehoder is not shown, otherwise is it displayed for a minimum period of time.
 *
 * States:
 * 0: Loading   - Wait for a period of time before starting the loading animation.
 * 1: Fade-in   - Display a loading animation.
 * 2: Fade-out  - Fade out the loading animation.
 * 3: Done      - Remove the placeholder.
 */
export const useLoading = (ready: boolean, debounce = 0) => {
  const [stage, setStage] = useState<LoadingState>(LoadingState.Loading);
  useEffect(() => {
    if (!debounce) {
      return;
    }

    const i = setInterval(() => {
      setStage((stage) => {
        switch (stage) {
          case LoadingState.Loading: {
            if (!ready) {
              return LoadingState.FadeIn;
            } else {
              clearInterval(i);
              return LoadingState.Done;
            }
          }

          case LoadingState.FadeIn: {
            if (ready) {
              return LoadingState.FadeOut;
            }
            break;
          }

          case LoadingState.FadeOut: {
            clearInterval(i);
            return LoadingState.Done;
          }
        }

        return stage;
      });
    }, debounce);

    return () => clearInterval(i);
  }, [debounce]);

  if (!debounce) {
    return ready ? LoadingState.Done : LoadingState.Loading;
  }

  return stage;
};
