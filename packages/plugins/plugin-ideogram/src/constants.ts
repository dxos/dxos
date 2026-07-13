//
// Copyright 2026 DXOS.org
//

/** Provider id contributed as `GenerationService.id`. */
export const IDEOGRAM_ID = 'ideogram';

/** `Connector.id` / `Connection.connectorId` for the Ideogram connector. */
export const IDEOGRAM_CONNECTOR_ID = 'org.dxos.plugin.ideogram.connector';

/** Matches `AccessToken.source`; the key `CredentialsService` resolves the API key under. */
export const IDEOGRAM_SOURCE = 'ideogram.ai';

/** Ideogram image-generation endpoint. */
export const IDEOGRAM_GENERATE_URL = 'https://api.ideogram.ai/generate';

/** Abort the `/generate` request after this many ms so a hung call cannot block the caller. */
export const IDEOGRAM_TIMEOUT_MS = 30_000;
