//
// Copyright 2020 DXOS.org
//

import config from './config';
import debugLogging from './debug-logging';
import feed from './feed';
import { HandlerProps } from './handler-props';
import items from './items';
import keys from './keys';
import network from './network';
import storage from './storage';
import topic from './topic';

export const initDevToolClientApi = ({ hook, bridge }: HandlerProps) => {
  [feed, keys, topic, storage, items, config, network, debugLogging]
    .forEach(register => register({ hook, bridge }));
};
