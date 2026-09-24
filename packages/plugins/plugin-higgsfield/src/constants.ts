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

/** The image service's default model. */
export const HIGGSFIELD_DEFAULT_IMAGE_MODEL = 'higgsfield-ai/soul/v2/standard';

/**
 * Default video model. Higgsfield's video models (DoP) animate a still (`image_url`): the cover of
 * the image artifact the request references — see the video service.
 */
export const HIGGSFIELD_DEFAULT_VIDEO_MODEL = 'higgsfield-ai/dop/lite';
