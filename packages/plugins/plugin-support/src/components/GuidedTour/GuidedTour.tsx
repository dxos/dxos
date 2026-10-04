//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import type * as Tour from '@dxos/app-toolkit/Tour';
import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as UiTour from '@dxos/react-ui/Tour';

import { meta } from '#meta';

import { TourContext } from './TourContext.ts';

const resolveTarget = (target: Tour.Step['target']) =>
  typeof target === 'string' ? () => document.querySelector<HTMLElement>(target) : target;

const toStep = (
  step: Tour.Step,
  index: number,
  capabilities: CapabilityManager.CapabilityManager,
): UiTour.StepDetails => ({
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

export type GuidedTourProps = {
  steps: readonly Tour.Step[];
  running?: boolean;
  onRunningChanged?: (state: boolean) => any;
};

export const GuidedTour = ({ steps: initialSteps, running: runningProp, onRunningChanged }: GuidedTourProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const manager = PluginManagerProvider.usePluginManager();
  const layout = Hooks.useLayout();
  const paused = layout.dialogOpen;
  const [override, setOverride] = useState<{ base: readonly Tour.Step[]; steps: readonly Tour.Step[] }>();
  const steps = override?.base === initialSteps ? override.steps : initialSteps;
  const setSteps = (next: readonly Tour.Step[]) => setOverride({ base: initialSteps, steps: next });
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
  const tour = UiTour.useTour({
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
        log.error('tour ended on a step whose target never appeared', {
          stepId: lastStepId.current,
          target: typeof ended.target === 'string' ? ended.target : '(resolver)',
        });
      }

      resumeAt.current = undefined;
      setRunning(false);
    },
  });

  // The machine takes its steps once, at creation, so a later set must be pushed in through the api.
  useEffect(() => {
    tour.setSteps([...tourSteps]);
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
      <UiTour.Root tour={tour}>
        <UiTour.Content
          classNames='w-60 min-h-40 gap-0 p-2 border-accent-bg bg-accent-bg text-accent-fg'
          data-testid='helpPlugin.tooltip'
        >
          <div className='flex items-start'>
            <UiTour.Title classNames='grow px-2 py-1 text-accent-fg' data-testid='helpPlugin.tooltip.title' />
            <UiTour.CloseTrigger asChild ref={closeRef}>
              <Button.Root
                size='md'
                icon='ph--x--bold'
                iconOnly
                label={t('tour-close.label')}
                iconSize='md'
                variant='primary'
                data-testid='helpPlugin.tooltip.close'
              />
            </UiTour.CloseTrigger>
          </div>
          <UiTour.Description classNames='grow px-4 my-2 text-accent-fg' />
          <UiTour.Control>
            <Button.Root
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
                <Icon.Icon
                  key={index}
                  icon={stepIndex === index ? 'ph--circle--fill' : 'ph--circle--regular'}
                  size='xs'
                  classNames='mx-1'
                />
              ))}
            </div>
            {last ? (
              <UiTour.CloseTrigger asChild>
                <Button.Root variant='primary' data-testid='helpPlugin.tooltip.finish'>
                  {t('tour-done.label')}
                </Button.Root>
              </UiTour.CloseTrigger>
            ) : (
              <Button.Root
                icon='ph--caret-right--regular'
                iconOnly
                label={t('tour-next.label')}
                onClick={() => tour.next()}
                iconSize='xl'
                variant='primary'
                data-testid='helpPlugin.tooltip.next'
              />
            )}
          </UiTour.Control>
        </UiTour.Content>
      </UiTour.Root>
    </TourContext.Provider>
  );
};
