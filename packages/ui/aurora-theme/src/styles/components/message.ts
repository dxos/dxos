//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Elevation, type MessageValence, type Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { messageValence, contentElevation } from '../fragments';

export type MessageStyleProps = {
  valence?: MessageValence;
  elevation?: Elevation;
};

export const messageRoot: ComponentFunction<MessageStyleProps> = ({ valence, elevation }, ...etc) =>
  mx('p-3 rounded-md max-is-full overflow-auto', contentElevation({ elevation }), messageValence(valence), ...etc);

export const messageTitle: ComponentFunction<MessageStyleProps> = (_props, ...etc) =>
  mx('text-base font-medium mb-2', ...etc);

export const messageBody: ComponentFunction<MessageStyleProps> = (_props, ...etc) => mx(...etc);

export const messageTheme: Theme<MessageStyleProps> = {
  root: messageRoot,
  title: messageTitle,
  body: messageBody,
};
