//
// Copyright 2026 DXOS.org
//

import { CrawlState } from '@dxos/crawler';
import { Topic } from '@dxos/pipeline-discord';
import { Person } from '@dxos/types';

import { DiscordChannel } from '#types';

export default [CrawlState.CrawlState, DiscordChannel.DiscordChannel, Person.Person, Topic.Topic];
