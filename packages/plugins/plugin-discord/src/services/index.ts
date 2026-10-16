//
// Copyright 2026 DXOS.org
//

export {
  DiscordEndpoint,
  type Endpoint,
  makeDiscordConnectionLayer,
  makeDiscordLayer,
  makeDiscordLayerFromToken,
  makeDiscordUserLayer,
  makeDiscordUserLayerFromToken,
  resolveDiscordToken,
} from './discord.ts';
export { mapDiscordMessage, threadRefsOf } from './discord-message.ts';
export { type SourceOptions, discordSourceLayer, discordSourceLayerFromConnection } from './discord-source.ts';
export { factFeedStoreLayer } from './fact-feed-store.ts';
export { type EdgeProxyHttpClientOptions, makeEdgeProxyHttpClientLayer } from './proxy-http-client.ts';
