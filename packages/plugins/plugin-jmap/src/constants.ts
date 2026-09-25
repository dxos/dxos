//
// Copyright 2026 DXOS.org
//

/** `Connector.id` for the JMAP mail connector (RFC 8620/8621); stored as `Connection.connectorId`. */
export const JMAP_MAIL_CONNECTOR_ID = 'jmap-mail';

/**
 * Default JMAP server host pre-filled in the credential form. Fastmail is the canonical JMAP
 * provider; the session is discovered at `https://${host}/.well-known/jmap`.
 */
export const JMAP_DEFAULT_HOST = 'api.fastmail.com';

/**
 * The provider's origin domain, used as the foreign-key `Meta.keys[].source` on everything this plugin
 * syncs — messages (the dedup key; see the mapper) and folder {@link Tag}s alike. One string for both
 * is deliberate: a foreign key is scoped by the object it sits on, so the type already distinguishes a
 * message key from a tag key, and `Tag.getOrigin` reads it to mark synced tags read-only.
 *
 * (Gmail is asymmetric here — its message source is the older `com.google.mail` while its tags carry
 * `com.google.gmail`. That is left alone deliberately: renaming a persisted message key would orphan
 * mail. See `Tag.md` §"Origin domain == key source".)
 */
export const JMAP_DOMAIN = 'org.ietf.jmap';
