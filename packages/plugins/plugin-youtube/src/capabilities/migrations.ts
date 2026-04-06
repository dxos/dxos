//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { defineObjectMigration } from '@dxos/client/echo';
import { ClientCapabilities } from '@dxos/plugin-client/types';

import { Channel, Video } from '../types';

const identityTransform = async (from: any) => ({ ...from });
const noopCallback = async () => {};

const migrations = [
  defineObjectMigration({
    from: Channel.LegacyYouTubeChannel,
    to: Channel.YouTubeChannel,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
  defineObjectMigration({
    from: Video.LegacyYouTubeVideo,
    to: Video.YouTubeVideo,
    transform: identityTransform,
    onMigration: noopCallback,
  }),
];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(ClientCapabilities.Migration, migrations);
  }),
);
