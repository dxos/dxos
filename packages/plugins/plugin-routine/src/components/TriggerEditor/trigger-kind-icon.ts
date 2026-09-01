//
// Copyright 2026 DXOS.org
//

import { type TriggerKind, type TriggerKindOption } from './TriggerKindSelector.tsx';

// Kept out of `TriggerKindSelector.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/** Icon for a trigger kind, shared by the picker rows and the selected-variant editor header. */
export const OPTIONS: readonly TriggerKindOption[] = [
  {
    kind: 'timer',
    icon: 'ph--clock-countdown--regular',
  },
  {
    kind: 'feed',
    icon: 'ph--cards-three--regular',
  },
  {
    kind: 'subscription',
    icon: 'ph--funnel--regular',
  },
  {
    kind: 'webhook',
    icon: 'ph--webhooks-logo--regular',
    disabled: true,
  },
  {
    kind: 'email',
    icon: 'ph--envelope--regular',
    disabled: true,
  },
];

export const getTriggerKindIcon = (kind: TriggerKind): string =>
  OPTIONS.find((option) => option.kind === kind)?.icon ?? 'ph--lightning--regular';
