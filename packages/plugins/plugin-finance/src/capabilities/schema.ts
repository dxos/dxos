//
// Copyright 2026 DXOS.org
//

import { Feed } from '@dxos/echo';
import * as Subscription from '@dxos/plugin-magazine/Subscription';

import { Finance } from '#types';

/** The feeds, their text items (magazine posts) and the structured observations the finance sources write. */
export default [Feed.Feed, Finance.Observation, Subscription.Post];
