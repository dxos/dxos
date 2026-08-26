//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { Format, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import { ConnectionTestError } from '@dxos/plugin-connector';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { headObject, objectKey } from '#services';

import { S3_CONNECTOR_ID, S3_SOURCE } from '../constants';

// Every field is `NonEmptyString`, not `String`: the dialog closes before `onSubmit` runs, so a
// failure raised there lands after unmount and is never shown. Rejecting empty in the schema keeps
// the form from submitting at all.
const S3CredentialForm = Schema.Struct({
  endpoint: Schema.NonEmptyString.annotate({
    title: 'Bucket endpoint',
    description:
      'The virtual-hosted bucket host, e.g. media.<account-id>.r2.cloudflarestorage.com or media.s3.eu-west-1.amazonaws.com.',
    examples: ['media.abc123.r2.cloudflarestorage.com'],
  }),
  accessKeyId: Schema.NonEmptyString.annotate({
    title: 'Access key ID',
    description: 'The S3 access key ID. For R2: Cloudflare dashboard → R2 → Manage API tokens.',
  }),
  secretAccessKey: Schema.NonEmptyString.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)).annotate({
    title: 'Secret access key',
    description: 'Shown once when the key pair is created; it cannot be read back afterwards.',
  }),
});

type S3CredentialFormValues = Schema.Schema.Type<typeof S3CredentialForm>;

/**
 * Strips everything but the host from what the user pasted. The dashboard hands out a full URL, and
 * a scheme or trailing path left in `AccessToken.source` would not match the host parsed out of a
 * blob URI at read time — a mismatch that reads as "no credential" rather than as a typo.
 */
export const normalizeEndpoint = (endpoint: string): string =>
  endpoint
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();

/**
 * The S3 connector. The bucket endpoint becomes `AccessToken.source`, the access key id
 * `AccessToken.account` (a non-secret identifier) and the secret `AccessToken.token` — so one
 * connection addresses exactly one bucket and the blob backend can find it from a URI's host alone.
 */
export const createS3ConnectorEntry = (): ConnectorSpec.ConnectorEntry => ({
  id: S3_CONNECTOR_ID,
  source: S3_SOURCE,
  label: 'S3 Storage',
  credentialForm: {
    schema: S3CredentialForm,
    defaultValues: { endpoint: '', accessKeyId: '', secretAccessKey: '' } satisfies Partial<S3CredentialFormValues>,

    // Runs while the dialog is still open, so these messages are the ones the user actually sees.
    // Catches what the schema cannot: input that is non-empty but collapses to nothing once trimmed,
    // and an endpoint that survives normalization as something other than a bare host.
    onValidate: ({ values }) =>
      Effect.gen(function* () {
        const host = normalizeEndpoint(values.endpoint);
        if (!host) {
          return yield* Effect.fail(new Error('Enter the bucket endpoint, e.g. media.abc123.r2.cloudflarestorage.com'));
        }
        if (!/^[a-z0-9.-]+(:\d+)?$/.test(host)) {
          return yield* Effect.fail(new Error(`Not a valid bucket host: ${host}`));
        }
        if (!values.accessKeyId.trim()) {
          return yield* Effect.fail(new Error('Enter the access key ID.'));
        }
        if (!values.secretAccessKey.trim()) {
          return yield* Effect.fail(new Error('Enter the secret access key.'));
        }
      }),

    onSubmit: ({ values, connector }) =>
      Effect.gen(function* () {
        const host = normalizeEndpoint(values.endpoint);
        const accessKeyId = values.accessKeyId.trim();
        const secretAccessKey = values.secretAccessKey.trim();

        const accessToken = Obj.make(AccessToken.AccessToken, {
          source: host,
          account: accessKeyId,
          token: secretAccessKey,
        });
        const connection = Obj.make(Connection.Connection, {
          name: connector.label ? `${connector.label} · ${host}` : host,
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });
        return { kind: 'complete' as const, accessToken, connection };
      }),
  },

  /**
   * Probes a key that should not exist. A signed `HEAD` on a missing object answers 404 on a working
   * connection and 403 when the key pair or signature is wrong, so the two are distinguishable
   * without needing write permission or leaving anything behind in the bucket.
   */
  testConnection: ({ accessToken }) =>
    Effect.tryPromise({
      try: () =>
        headObject({
          uri: { host: accessToken.source, key: objectKey({ spaceId: '_probe', contentHash: 'connection-test' }) },
          credentials: { accessKeyId: accessToken.account ?? '', secretAccessKey: accessToken.token },
        }),
      catch: (cause) => new ConnectionTestError({ cause }),
    }).pipe(Effect.asVoid),
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [createS3ConnectorEntry()]);
  }),
);
