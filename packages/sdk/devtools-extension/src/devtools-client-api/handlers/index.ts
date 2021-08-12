//
// Copyright 2020 DXOS.org
//

import config from './config';
import debugLogging from './debug-logging';
import feed from './feed';
import feedstore from './feedstore';
import items from './items';
import keys from './keys';
import metrics from './metrics';
import network from './network';
import snapshots from './snapshots';
import storage from './storage';
import topic from './topic';
import { HandlerProps } from "./handler-props";

export const initDevToolClientApi = ({ hook, bridge }: HandlerProps) => {
  [feed, feedstore, keys, metrics, topic, storage, items, config, snapshots, network, debugLogging]
    .forEach(register => register({ hook, bridge }));
};
