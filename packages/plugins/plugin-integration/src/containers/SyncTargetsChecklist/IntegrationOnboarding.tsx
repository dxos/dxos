//
// Copyright 2026 DXOS.org
//

import { useEffect, useRef } from 'react';

import { useSyncTargetsChecklist } from '#hooks';

import { type Integration } from '../../types';

export type IntegrationOnboardingProps = {
  /** Newly-created integration whose targets should be configured. */
  integration: Integration.Integration;
  /** Fires when onboarding is finished — the dialog request was dispatched, or no checklist was needed. */
  onDone: () => void;
};

/**
 * Drives the post-OAuth "choose sync targets" step for a freshly-created
 * Integration by triggering the sync-targets dialog Surface (when the matching
 * provider exposes `getSyncTargets`) and then signalling completion.
 *
 * Renders nothing — the dialog itself is owned by the layout system.
 */
export const IntegrationOnboarding = ({ integration, onDone }: IntegrationOnboardingProps) => {
  const { available, openChecklist } = useSyncTargetsChecklist(integration);
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;
    triggered.current = true;
    if (available) {
      void openChecklist().finally(onDone);
    } else {
      onDone();
    }
  }, [available, openChecklist, onDone]);

  return null;
};
