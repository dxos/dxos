//
// Copyright 2026 DXOS.org
//

/** Provider id contributed as `GenerationService.id` (shared by the image and video services). */
export const HIGGSFIELD_ID = 'higgsfield';

/** `Connector.id` / `Connection.connectorId` for the Higgsfield connector. */
export const HIGGSFIELD_CONNECTOR_ID = 'org.dxos.plugin.higgsfield.connector';

/** Matches `AccessToken.source`; the key `CredentialsService` resolves the credential under. */
export const HIGGSFIELD_SOURCE = 'higgsfield.ai';

/** Higgsfield Cloud API base. Model endpoints are `POST {base}/<model path>`. */
export const HIGGSFIELD_API_URL = 'https://api.higgsfield.ai';

/** The only model path in the public docs (text-to-image); the image service's default. */
export const HIGGSFIELD_DEFAULT_IMAGE_MODEL = 'higgsfield-ai/soul/v2/standard';
