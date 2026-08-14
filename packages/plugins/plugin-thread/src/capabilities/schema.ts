//
// Copyright 2023 DXOS.org
//

import { Channel, Message, Thread } from '@dxos/types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Channel.Channel, Message.Message, Thread.Thread];
