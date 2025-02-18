//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type MessageValence, type Theme } from '@dxos/react-ui-types';

import { mx } from '../../util';
import { messageValence } from '../fragments';

export type MessageStyleProps = {
  valence?: MessageValence;
  elevation?: Elevation;
};

export const messageRoot: ComponentFunction<MessageStyleProps> = ({ valence, elevation }, ...etc) =>
  mx('p-3 max-is-full overflow-auto rounded-md', messageValence(valence), ...etc);

export const messageTitle: ComponentFunction<MessageStyleProps> = (_props, ...etc) =>
  mx('mb-2 text-baseText font-medium', ...etc);

export const messageBody: ComponentFunction<MessageStyleProps> = (_props, ...etc) => mx(...etc);

export const messageTheme: Theme<MessageStyleProps> = {
  root: messageRoot,
  title: messageTitle,
  body: messageBody,
};
