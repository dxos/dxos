//
// Copyright 2026 DXOS.org
//

import { Event, Message } from '@dxos/types';

import { Calendar, Mailbox } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 */
export default [Event.Event, Mailbox.Mailbox, Calendar.Calendar, Message.Message];
