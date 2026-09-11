//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { usePluginManager } from '@dxos/app-framework/ui';
import type * as Tour from '@dxos/app-toolkit/Tour';
import { useLayout } from '@dxos/app-toolkit/ui';
import { log } from '@dxos/log';
import {
  Button,
  Icon,
  IconButton,
  Tour as TourComponent,
  type TourStepDetails,
  useTour,
  useTranslation,
} from '@dxos/react-ui';

import { meta } from '#meta';

import { TourContext } from './TourContext.ts';

const resolveTarget = (target: Tour.Step['target']) =>
  typeof target === 'string' ? () => document.querySelector<HTMLElement>(target) : target;

/** `before` becomes the machine's step effect, so the target is resolved after it settles. */
const toStep = (
  step: Tour.Step,
  index: number,
  capabilities: CapabilityManager.CapabilityManager,
): TourStepDetails => ({
  id: step.id ?? String(index + 1),
  type: 'tooltip',
  target: resolveTarget(step.target),
  title: step.title,
  description: step.description,
  placement: step.placement,
  arrow: true,
  ...(step.before && {
    effect: ({ show }) => {
      void Promise.resolve()
        .then(() => step.before?.(capabilities))
        .catch((error) => log.catch(error))
        .finally(show);
    },
  }),
});

export type WelcomeTourProps = {
  steps: Tour.Step[];
  running?: boolean;
  onRunningChanged?: (state: boolean) => any;
};

/** Pauses while a dialog is open, resuming at the same step, and ends when a target never appears. */
export const WelcomeTour = ({ steps: initialSteps, running: runningProp, onRunningChanged }: WelcomeTourProps) => {
  const { t } = useTranslation(meta.profile.key);
  const manager = usePluginManager();
  const layout = useLayout();
  const paused = layout.dialogOpen;
  const [override, setOverride] = useState<{ base: Tour.Step[]; steps: Tour.Step[] }>();
  const steps = override?.base === initialSteps ? override.steps : initialSteps;
  const setSteps = (next: Tour.Step[]) => setOverride({ base: initialSteps, steps: next });
  const tourSteps = useMemo(
    () => steps.map((step, index) => toStep(step, index, manager.capabilities)),
    [steps, manager],
  );

  const [runningState, setRunningState] = useState(false);
  const running = runningProp ?? runningState;
  const setRunning = (state: boolean) => {
    if (typeof runningProp !== 'undefined') {
      onRunningChanged?.(state);
    } else {
      setRunningState(state);
    }
  };

  const resumeAt = useRef<string | undefined>(undefined);
  const pausing = useRef(false);
  const lastStepId = useRef<string | undefined>(undefined);
  const tour = useTour({
    steps: tourSteps,
    closeOnInteractOutside: false,
    onStepChange: ({ stepId }) => {
      resumeAt.current = stepId ?? undefined;
      lastStepId.current = stepId ?? undefined;
    },
    onStatusChange: ({ status }) => {
      if (status === 'started') {
        return;
      }
      if (pausing.current) {
        pausing.current = false;
        return;
      }

      const ended = steps.find((step, index) => (step.id ?? String(index + 1)) === lastStepId.current);
      if (ended && !resolveTarget(ended.target)()) {
        log.warn('tour ended on a step whose target never appeared', {
          stepId: lastStepId.current,
          target: typeof ended.target === 'string' ? ended.target : '(resolver)',
        });
      }

      resumeAt.current = undefined;
      setRunning(false);
    },
  });

  // The machine takes its steps once, at creation, so a later set must be pushed in through the api.
  // Must precede the start effect below.
  useEffect(() => {
    tour.setSteps(tourSteps);
  }, [tourSteps]);

  // The machine exposes no dismiss beyond its close trigger, so a pause clicks it.
  const closeRef = useRef<HTMLButtonElement>(null);
  const shouldRun = running && !paused;
  useEffect(() => {
    if (shouldRun && !tour.open) {
      tour.start(resumeAt.current);
    } else if (!shouldRun && tour.open) {
      pausing.current = paused;
      closeRef.current?.click();
    }
  }, [shouldRun, tour.open]);

  const stepIndex = tour.stepIndex;
  const last = tour.lastStep;

  return (
    <TourContext.Provider
      value={{
        running: shouldRun,
        steps,
        setSteps,
        setIndex: (index) => {
          const step = tourSteps[index];
          if (step) {
            tour.setStep(step.id);
          }
        },
        start: () => setRunning(true),
        stop: () => setRunning(false),
      }}
    >
      <TourComponent.Root tour={tour}>
        <TourComponent.Portal>
          <TourComponent.Spotlight />
          <TourComponent.Positioner>
            <TourComponent.Content
              classNames='w-60 min-h-40 gap-0 p-2 border-accent-bg bg-accent-bg text-accent-fg'
              data-testid='helpPlugin.tooltip'
            >
              <TourComponent.Arrow classNames='[--arrow-background:var(--color-accent-bg)] [&>[data-part=arrow-tip]]:border-accent-bg' />
              <div className='flex items-start'>
                <TourComponent.Title
                  classNames='grow px-2 py-1 text-accent-fg'
                  data-testid='helpPlugin.tooltip.title'
                />
                <TourComponent.Close asChild ref={closeRef}>
                  <IconButton
                    density='md'
                    icon='ph--x--bold'
                    iconOnly
                    label={t('tour-close.label')}
                    size={4}
                    variant='primary'
                    data-testid='helpPlugin.tooltip.close'
                  />
                </TourComponent.Close>
              </div>
              <TourComponent.Description classNames='grow px-4 my-2 text-accent-fg' />
              <TourComponent.Control>
                <IconButton
                  classNames={[!tour.hasPrevStep && 'invisible']}
                  icon='ph--caret-left--regular'
                  iconOnly
                  label={t('tour-back.label')}
                  onClick={() => tour.prev()}
                  variant='primary'
                  data-testid='helpPlugin.tooltip.back'
                />
                <div className='flex grow justify-center'>
                  {Array.from({ length: tour.totalSteps }).map((_, index) => (
                    <Icon
                      key={index}
                      icon={stepIndex === index ? 'ph--circle--fill' : 'ph--circle--regular'}
                      size={2}
                      classNames='mx-1'
                    />
                  ))}
                </div>
                {last ? (
                  <TourComponent.Close asChild>
                    <Button variant='primary' data-testid='helpPlugin.tooltip.finish'>
                      {t('tour-done.label')}
                    </Button>
                  </TourComponent.Close>
                ) : (
                  <IconButton
                    icon='ph--caret-right--regular'
                    iconOnly
                    label={t('tour-next.label')}
                    onClick={() => tour.next()}
                    size={6}
                    variant='primary'
                    data-testid='helpPlugin.tooltip.next'
                  />
                )}
              </TourComponent.Control>
            </TourComponent.Content>
          </TourComponent.Positioner>
        </TourComponent.Portal>
      </TourComponent.Root>
    </TourContext.Provider>
  );
};
