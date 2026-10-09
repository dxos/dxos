//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Connection } from '@dxos/link';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tag from '@dxos/react-ui/Tag';
import { type PublishFieldNote } from '@dxos/schema';

import { meta } from '#meta';
import { AtprotoCapabilities, AtprotoPublication } from '#types';

import { getFieldPublishFlags } from '../../annotation.ts';
import { isAtprotoConnection } from '../../connection.ts';
import { resolveDisplayValue } from '../../field-values.ts';
import {
  type DisplayStatus,
  computeStatus,
  deriveDisplayStatus,
  encodeRecord,
  inspectPublish,
  publishObject,
  unpublishObject,
} from '../../publish.ts';
import * as AtprotoRepo from '../../services/AtprotoRepo.ts';

export type AtprotoCompanionProps = AppSurface.ArticleProps<Obj.Unknown>;

type StatusValence = 'neutral' | 'info' | 'success' | 'warning';

const STATUS_META: Record<DisplayStatus, { key: string; icon: string; valence: StatusValence }> = {
  unknown: { key: 'status-unknown.label', icon: 'ph--wifi-slash--regular', valence: 'warning' },
  ineligible: { key: 'status-ineligible.label', icon: 'ph--prohibit--regular', valence: 'neutral' },
  ready: { key: 'status-ready.label', icon: 'ph--cloud-arrow-up--regular', valence: 'info' },
  published: { key: 'status-published.label', icon: 'ph--cloud-check--regular', valence: 'success' },
  outOfDate: { key: 'status-out-of-date.label', icon: 'ph--cloud-arrow-up--regular', valence: 'warning' },
};

// Inline-start inset per nesting level; the grouping is presentational, so the indent is applied
// directly rather than derived from a row level.
const INDENT_REM = 1;

/**
 * Generic atproto publishing companion: shows the object's public projection (which fields the network
 * sees vs. which stay private/linked, as a treegrid), the publish status, and a publish / update /
 * unpublish toolbar against the space's atproto connection.
 */
export const AtprotoCompanion = ({ subject, role, attendableId }: AtprotoCompanionProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const makeRepoLayer = Hooks.useCapability(AtprotoCapabilities.RepoLayer);
  const db = Obj.getDatabase(subject);
  // Subscribe to the object so edits recompute status and field values (read from this snapshot).
  const [live] = useObject(subject);

  const allConnections = useQuery(db, Filter.type(Connection.Connection));
  const connections = useMemo(() => allConnections.filter(isAtprotoConnection), [allConnections]);
  const connection = connections[0];

  const publications = useQuery(
    db,
    Query.select(Filter.id(subject.id)).targetOf(AtprotoPublication.AtprotoPublication),
  );
  const publication = publications.find(AtprotoPublication.instanceOf);

  const fields = useMemo(() => {
    const type = Obj.getType(subject);
    return type ? getFieldPublishFlags(Type.getSchema(type)) : [];
  }, [subject]);

  // Undefined until the first (async, network-aware) derivation resolves — the UI shows a neutral
  // "checking" state rather than flashing a definitive (possibly wrong) status.
  const [status, setStatus] = useState<DisplayStatus | undefined>();
  const [canPublish, setCanPublish] = useState(false);
  const [ineligibleReason, setIneligibleReason] = useState<string | undefined>();
  const [mirrorResolved, setMirrorResolved] = useState<boolean | undefined>();
  const [fieldNotes, setFieldNotes] = useState<Record<string, PublishFieldNote>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Codec encoding is async (WASM-backed), inspection is network-aware, and displayed field values may
  // resolve refs — so publish state and values are derived in an effect and refreshed when the object
  // mutates (`live`) or its publication changes. Note: this subscribes to the subject only, not to the
  // targets of ref-typed fields (e.g. a review Text), so edits to a ref's content refresh here only on
  // the next subject mutation or remount, not live.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const record = await encodeRecord(subject);
        const publishStatus = await computeStatus(subject, publication);
        const inspection = await inspectPublish(subject);
        const nextValues: Record<string, string> = {};
        for (const field of fields) {
          if (!field.group && field.visibility !== 'private') {
            nextValues[field.path] = await resolveDisplayValue(Obj.getValue(subject, field.path.split('.')));
          }
        }
        if (!cancelled) {
          setCanPublish(Boolean(record) && inspection.eligibility.ok);
          setIneligibleReason(inspection.eligibility.ok ? undefined : inspection.eligibility.reason);
          setMirrorResolved(inspection.mirrorResolved);
          setFieldNotes(inspection.fieldNotes ?? {});
          setValues(nextValues);
          setStatus(deriveDisplayStatus(publishStatus, inspection.eligibility));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subject, publication, live, fields]);

  const run = useCallback(
    async (program: Effect.Effect<unknown, unknown, AtprotoRepo.Service>) => {
      if (!connection || !db) {
        return;
      }
      setBusy(true);
      setError(undefined);
      try {
        await EffectEx.runPromise(program.pipe(Effect.provide(makeRepoLayer(connection))));
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
        setConfirming(false);
      }
    },
    [connection, db, makeRepoLayer],
  );

  const handlePublish = useCallback(() => {
    if (!connection || !db) {
      return;
    }
    // First publish requires explicit confirmation; updates are silent.
    if (!publication && !confirming) {
      setConfirming(true);
      return;
    }
    void run(publishObject({ object: subject, connection, db, existing: publication }));
  }, [connection, db, subject, publication, confirming, run]);

  const handleUnpublish = useCallback(() => {
    if (!db || !publication) {
      return;
    }
    void run(unpublishObject({ publication, db }));
  }, [db, publication, run]);

  // The publish controls are data (an action graph), rebuilt when the reactive state they depend on
  // changes. The primary publish/update action is always shown, disabled when already in sync.
  const menuActions = useMenuBuilder(() => {
    const inSync = status === 'published';
    const builder = MenuBuilder.make()
      .root({ label: ['publish-actions.label', { ns: meta.profile.key }] })
      .action(
        'publish',
        {
          // "Update" once a record exists (regardless of status), "Publish" for the first push.
          label: [publication ? 'update.label' : 'publish.label', { ns: meta.profile.key }],
          icon: 'ph--cloud-arrow-up--regular',
          disabled: busy || !connection || !canPublish || inSync,
        },
        handlePublish,
      );
    if (publication) {
      builder.action(
        'unpublish',
        { label: ['unpublish.label', { ns: meta.profile.key }], icon: 'ph--cloud-slash--regular', disabled: busy },
        handleUnpublish,
      );
    }
    return builder.build();
  }, [status, busy, canPublish, connection, publication, handlePublish, handleUnpublish]);

  const statusMeta = status ? STATUS_META[status] : undefined;
  // An unverifiable state (offline) is a transient info; a definitive block is a warning.
  const reasonValence = status === 'unknown' ? 'info' : 'warning';
  // Whether the object has any Mirrored fields whose upstream link failed to resolve — those fields
  // are then visible nowhere despite their tag.
  const mirroredUnresolved =
    mirrorResolved === false && fields.some((field) => !field.group && field.visibility === 'mirror');
  // Published field values at last publish; a Published field whose current value differs has diverged
  // (and is what puts the object out of sync). Absent on older publications.
  const publishedValues = publication?.publishedValues;

  return (
    <Panel.Root role={role}>
      <Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport>
            <Layout.Flex column gap='md' classNames='p-3'>
              {/* Publish status — the status icon overrides the Message's default valence icon. A
                  neutral "checking" state shows until the first async derivation resolves. */}
              <Banner.Root
                valence={statusMeta?.valence ?? 'neutral'}
                icon={statusMeta?.icon ?? 'ph--circle-notch--regular'}
              >
                <Banner.Title>{t(statusMeta?.key ?? 'status-checking.label')}</Banner.Title>
              </Banner.Root>

              {/* Reasons publishing is unavailable. */}
              {!connection && (
                <Banner.Root valence='info'>
                  <Banner.Body>{t('no-connection.label')}</Banner.Body>
                </Banner.Root>
              )}
              {ineligibleReason && (
                <Banner.Root valence={reasonValence}>
                  <Banner.Body>{ineligibleReason}</Banner.Body>
                </Banner.Root>
              )}
              {error && (
                <Banner.Root valence='error'>
                  <Banner.Body>{error}</Banner.Body>
                </Banner.Root>
              )}

              {/* First-publish confirmation. */}
              {confirming && (
                <Banner.Root valence='warning'>
                  <Banner.Body>{t('confirm-publish.message')}</Banner.Body>
                  <Banner.Body asChild>
                    <Layout.Flex gap='sm' classNames='pt-2'>
                      <Button.Root variant='primary' disabled={busy} onClick={handlePublish}>
                        {t('confirm-publish.label')}
                      </Button.Root>
                      <Button.Root disabled={busy} onClick={() => setConfirming(false)}>
                        {t('cancel.label')}
                      </Button.Root>
                    </Layout.Flex>
                  </Banner.Body>
                </Banner.Root>
              )}

              {/* Public projection: what the network sees, as a treegrid. Each leaf is tagged Published (we
                  publish it), Mirrored (the network sees it via a linked upstream record), or Private;
                  fields whose local value diverges from the mirrored record are flagged Diverged (not pushed). */}
              <Layout.Container gap='sm' gutter='none'>
                <h2 className='text-xs uppercase tracking-wide text-fg-muted'>{t('network-view.label')}</h2>
                {mirroredUnresolved && (
                  <Banner.Root valence='warning'>
                    <Banner.Body>{t('mirror-unresolved.label')}</Banner.Body>
                  </Banner.Root>
                )}
                {/* A read-only field listing: three columns, no disclosure and nothing focusable, so it
                    is a table rather than the `treegrid` this used to claim. Depth is visual indent only. */}
                <Layout.Grid role='table' cols={['fill', 'fill', 'min']} classNames='gap-x-3'>
                  {fields.map((field) => {
                    const published = field.visibility === 'publish';
                    const mirrored = field.visibility === 'mirror';
                    const visible = published || mirrored;
                    const value = !field.group && visible ? values[field.path] : undefined;
                    // Diverged from the network's current value — the source depends on visibility:
                    // a Mirrored field differs from the upstream record (from inspect); a Published field
                    // differs from what we last published (the snapshot). The two are mutually exclusive by
                    // visibility, so a Published field is never judged against upstream (which would false-
                    // positive when its value is deliberately different from the catalog).
                    const diverged =
                      !field.group &&
                      ((mirrored && fieldNotes[field.path]?.diverged) ||
                        (published &&
                          value !== undefined &&
                          typeof publishedValues?.[field.path] === 'string' &&
                          publishedValues[field.path] !== value));
                    return (
                      <Layout.Grid
                        key={field.path}
                        role='row'
                        cols='subgrid'
                        align='center'
                        classNames={['py-0.5', field.group ? 'font-medium' : 'font-normal']}
                      >
                        <Layout.Flex
                          role='rowheader'
                          align='center'
                          style={field.depth > 0 ? { paddingInlineStart: `${field.depth * INDENT_REM}rem` } : undefined}
                        >
                          <span className={`truncate text-sm ${field.group || visible ? '' : 'text-fg-muted'}`}>
                            {field.name}
                          </span>
                        </Layout.Flex>
                        <div role='cell' className='truncate text-sm text-fg-muted'>
                          {value}
                        </div>
                        <Layout.Flex role='cell' align='center' justify='end' gap='xs' classNames='shrink-0'>
                          {!field.group && (
                            <>
                              {diverged && <Tag.Tag hue='warning'>{t('diverged-field.label')}</Tag.Tag>}
                              <Tag.Tag hue={published ? 'success' : mirrored ? 'info' : 'neutral'}>
                                {published
                                  ? t('published-field.label')
                                  : mirrored
                                    ? t('mirrored-field.label')
                                    : t('private-field.label')}
                              </Tag.Tag>
                            </>
                          )}
                        </Layout.Flex>
                      </Layout.Grid>
                    );
                  })}
                </Layout.Grid>
              </Layout.Container>
            </Layout.Flex>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
