//
// Copyright 2025 DXOS.org
//

import { type Theme, type ComponentFunction } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { descriptionMessage } from '../fragments';

// TODO(burdon): Move shared def to react-ui-types.
type Severity = 'info' | 'warning' | 'success' | 'error';

export type CalloutStyleProps = {
  severity?: Severity;
};

export const calloutRoot: ComponentFunction<CalloutStyleProps> = ({ severity }, etc) => {
  return mx('flex gap-3 items-center rounded-md', descriptionMessage, etc);
};

export const calloutIcon: ComponentFunction<CalloutStyleProps> = ({ severity }, etc) => {
  return mx(etc);
};

export const calloutText: ComponentFunction<CalloutStyleProps> = ({ severity }, etc) => {
  return mx('font-medium text-baseText', etc);
};

export const calloutTheme: Theme<CalloutStyleProps> = {
  root: calloutRoot,
  icon: calloutIcon,
  text: calloutText,
};
