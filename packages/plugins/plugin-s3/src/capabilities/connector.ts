//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import { objectKey, probeAccess, regionFromHost } from '@dxos/blob/s3';
import { Format, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import { ConnectionTestError } from '@dxos/plugin-connector';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { S3_CONNECTOR_ID, S3_SOURCE } from '../constants.ts';

// Every field is `NonEmptyString`, not `String`: the dialog closes before `onSubmit` runs, so a
// failure raised there lands after unmount and is never shown. Rejecting empty in the schema keeps
// the form from submitting at all.
const S3CredentialForm = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotate({
      title: 'Name',
      description: 'Optional label for this connection. Defaults to the bucket name.',
    }),
  ),
  // Bucket and endpoint are separate fields because that is how every dashboard hands them over:
  // Cloudflare shows one account-wide endpoint and lists buckets beside it. Asking for them
  // pre-joined invites the account endpoint on its own, which addresses no bucket at all and fails
  // only later, as an opaque `InvalidBucketName` from the first request.
  bucket: Schema.NonEmptyString.annotate({
    title: 'Bucket',
    description: 'The bucket name on its own, e.g. media.',
    examples: ['media'],
  }),
  endpoint: Schema.NonEmptyString.annotate({
    title: 'Endpoint',
    description:
      'The account endpoint without the bucket, e.g. <account-id>.r2.cloudflarestorage.com or s3.eu-west-1.amazonaws.com.',
    examples: ['abc123.r2.cloudflarestorage.com'],
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
 * Joins bucket and endpoint into the virtual-hosted host that addresses the bucket. Tolerates an
 * endpoint that already carries the bucket, since that is what the field asked for previously and
 * what a user copying a full bucket URL will paste.
 */
export const composeHost = ({ bucket, endpoint }: { bucket: string; endpoint: string }): string => {
  const host = normalizeEndpoint(endpoint);
  const name = bucket.trim().toLowerCase();
  return !name || host.startsWith(`${name}.`) ? host : `${name}.${host}`;
};

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
    defaultValues: {
      bucket: '',
      endpoint: '',
      accessKeyId: '',
      secretAccessKey: '',
    } satisfies Partial<S3CredentialFormValues>,

    // Runs while the dialog is still open, so these messages are the ones the user actually sees.
    // Catches what the schema cannot: input that is non-empty but collapses to nothing once trimmed,
    // and an endpoint that survives normalization as something other than a bare host.
    onValidate: ({ values }) =>
      Effect.gen(function* () {
        if (!values.bucket.trim()) {
          return yield* Effect.fail(new Error('Enter the bucket name.'));
        }
        const host = composeHost(values);
        if (!host) {
          return yield* Effect.fail(new Error('Enter the endpoint, e.g. abc123.r2.cloudflarestorage.com'));
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
        const host = composeHost(values);
        const accessKeyId = values.accessKeyId.trim();
        const secretAccessKey = values.secretAccessKey.trim();

        const accessToken = Obj.make(AccessToken.AccessToken, {
          source: host,
          account: accessKeyId,
          token: secretAccessKey,
        });
        const connection = Obj.make(Connection.Connection, {
          // The bucket alone, not the connector label plus the full endpoint: the name is a sidebar
          // row, and the account id in a virtual-hosted host is 32 characters of noise there.
          name: values.name?.trim() || values.bucket.trim(),
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        });
        return { kind: 'complete' as const, accessToken, connection };
      }),
  },

  /**
   * Bucket, endpoint, key id and signing region — every non-secret half of the credential. The
   * secret is deliberately absent; `AccessToken.account` holds the key id precisely because it is
   * the identifier rather than the secret.
   */
  describeConnection: ({ accessToken }) => {
    const [bucket, ...rest] = accessToken.source.split('.');
    return [
      { label: 'Bucket', value: bucket },
      { label: 'Endpoint', value: rest.join('.') },
      { label: 'Access key ID', value: accessToken.account ?? '—' },
      { label: 'Region', value: regionFromHost(accessToken.source) },
    ];
  },

  /**
   * Probes a key that should not exist: it needs no write permission and leaves nothing behind.
   *
   * Uses `probeAccess` rather than `headObject`, which reports 403 and 404 alike as "not there" —
   * right for reading a blob, wrong here, where a rejected key reported as a miss would pass the
   * test. The failure's own message is passed through as `ConnectionTestError.message`, since that
   * is what the connection UI displays; the default would flatten every cause to "Connection test
   * failed." and strand the diagnosis in the console.
   */
  testConnection: ({ accessToken }) =>
    Effect.tryPromise({
      try: () =>
        probeAccess({
          uri: { host: accessToken.source, key: objectKey({ spaceId: '_probe', contentHash: 'connection-test' }) },
          credentials: { accessKeyId: accessToken.account ?? '', secretAccessKey: accessToken.token },
        }),
      catch: (cause) =>
        new ConnectionTestError({ message: cause instanceof Error ? cause.message : String(cause), cause }),
    }),
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ConnectorSpec.Connector, [createS3ConnectorEntry()]);
  }),
);
