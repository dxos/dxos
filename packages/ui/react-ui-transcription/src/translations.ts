//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-transcription';

/**
 * Strings for the controls this package renders. Owned here rather than by a consuming plugin —
 * a component that renders no text until a caller names a namespace cannot be dropped into a story
 * or another package without that caller also shipping its strings.
 */
export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'recording-options.label': 'Recording options',
        'record-mode.label': 'Record mode',
        'record-mode.toggle.label': 'Toggle',
        'record-mode.hold.label': 'Hold to record (push to talk)',
        'audio-device.label': 'Microphone',
        'audio-device.default.label': 'System default',
        'settings.entity-extraction.label': 'Entity extraction',
      },
    },
  },
] as const satisfies Resource[];
