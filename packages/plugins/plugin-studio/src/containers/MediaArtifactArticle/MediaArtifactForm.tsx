//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useAppGraph, useProgressMonitor } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useObjects, useQuery } from '@dxos/echo-react';
import { Connection } from '@dxos/link';
import { log } from '@dxos/log';
import { useActionRunner } from '@dxos/plugin-graph/hooks';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Field, Flex, Panel, Select, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { ActionToolbar, MenuBuilder, graphActions, isToolbarAction, useMenuBuilder } from '@dxos/react-ui-menu';

import { meta } from '#meta';
import { type MediaArtifact, StudioCapabilities, StudioOperation, Variant } from '#types';

import { providerFieldMap } from './ProviderOptionsField.tsx';

export type MediaArtifactFormProps = ThemedClassName<{
  artifact: MediaArtifact.MediaArtifact;
  /** The plank the form is attended through; Generate is live only while it has attention. */
  attendableId?: string;
  /**
   * App-graph node the toolbar's contributed actions (Connect) are read from. Defaults to
   * `attendableId`, which is the plank's node when the artifact is the plank; an artifact hosted by
   * another article (a storyboard frame) is attended through its host but has its own node.
   */
  nodeId?: string;
}>;

/**
 * The compose side of a {@link MediaArtifact}: a toolbar with the generator selector and the
 * Connect/Generate action (plus an overflow Delete), the artifact's name, and the generator's
 * schema-driven request form bound to the artifact's persisted `request`. Generating submits that
 * request and appends a produced {@link Variant}; the produced set is shown by
 * `MediaArtifactVariants`, which this deliberately leaves out so a narrow host (a companion) is
 * the form alone.
 */
export const MediaArtifactForm = ({
  classNames,
  artifact,
  attendableId,
  nodeId = attendableId,
}: MediaArtifactFormProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(artifact);

  // Providers for the artifact's kind; a Generator selector lets the user pick among them.
  const services = useCapabilities(StudioCapabilities.GenerationService);
  const providers = useMemo(
    () => services.filter((candidate) => candidate.kind === artifact.kind),
    [services, artifact.kind],
  );
  const [artifactSnapshot] = useObject(artifact);
  // The chosen generator (persisted on the artifact) drives the request form, connect button, and op.
  const provider = useMemo(
    () => providers.find((candidate) => candidate.id === artifactSnapshot?.generator) ?? providers[0],
    [providers, artifactSnapshot?.generator],
  );
  const handleGeneratorChange = useCallback(
    (id: string) =>
      Obj.update(artifact, (artifact) => {
        artifact.generator = id;
      }),
    [artifact],
  );
  const variantRefs = artifactSnapshot?.variants ?? [];
  const variants = useObjects(variantRefs);

  const artifactId = artifact.id;
  // In-memory draft variant (never added to the db): the editable compose surface, seeded from the
  // artifact's persisted request over the provider's defaults. Reset when the generator changes so
  // it seeds from the new provider's default config. A request composed for another generator (the
  // artifact's kind or generator changed since) is left out: its `model` names a job the new
  // provider's API rejects.
  const draft = useMemo(() => {
    const generator = artifactSnapshot?.generator;
    const request = !generator || generator === provider?.id ? artifact.request : undefined;
    return Variant.make({ config: { ...(provider?.defaultRequest ?? {}), ...(request ?? {}) } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactId, provider?.id, artifactSnapshot?.generator]);
  // Observe the draft so edits (via the form) re-render for the Generate-enabled check.
  const [draftSnapshot] = useObject(draft);
  const [generating, setGenerating] = useState(false);

  // Connector-managed credential: the connector plugin contributes a "Connect" action (via the
  // MediaArtifact type's `ConnectorAuthAnnotation`) until a connection for the provider exists.
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const connected = provider?.connectorId
    ? connections.some((connection) => connection.connectorId === provider.connectorId)
    : true;
  const { graph } = useAppGraph();
  // The deck expands a plank's node; an artifact hosted by another article (a storyboard frame) has
  // a node of its own that nothing else expands, and an unexpanded node has no actions — no Connect.
  useEffect(() => {
    if (!graph || !nodeId || nodeId === attendableId) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      void AppGraph.expandSync(graph, nodeId, 'action');
    });
    return () => cancelAnimationFrame(frame);
  }, [graph, nodeId, attendableId]);
  const runAction = useActionRunner();

  // Provider-listed fields render as comboboxes; the provider's own renderers take precedence.
  const fieldMap = useMemo(() => (provider ? providerFieldMap(provider) : undefined), [provider]);

  // The draft's request config (provider defaults overlaid with the draft's edits).
  const draftConfig = useMemo<Record<string, unknown>>(
    () => ({ ...(provider?.defaultRequest ?? {}), ...(draft.config ?? {}) }),
    [provider?.defaultRequest, draft],
  );
  // Edits land on the artifact too, so the request survives a remount and reaches other peers.
  const handleConfigChange = useCallback(
    (next: Record<string, unknown>) => {
      Obj.update(draft, (draft) => {
        draft.config = next;
      });
      Obj.update(artifact, (artifact) => {
        artifact.request = next;
        artifact.generator = provider?.id;
      });
    },
    [draft, artifact, provider?.id],
  );
  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.value;
      Obj.update(artifact, (artifact) => {
        artifact.name = next.length > 0 ? next : undefined;
      });
    },
    [artifact],
  );

  // Generation consumes the draft (its config + prompt) and appends a new frozen variant.
  const handleGenerate = useCallback(async () => {
    if (!db) {
      return;
    }

    setGenerating(true);
    try {
      await invokePromise(
        StudioOperation.Generate,
        { artifact: Ref.make(artifact), provider: provider?.id, name: draft.name, config: draft.config },
        { spaceId: db.spaceId },
      );
    } catch (error) {
      log.catch(error);
      void invokePromise(LayoutOperation.AddToast, {
        id: `${meta.profile.key}/generate-error`,
        icon: 'ph--warning--regular',
        duration: 5_000,
        title: ['generate-error.title', { ns: meta.profile.key }],
        description: error instanceof Error ? error.message : String(error),
        closeLabel: ['close.label', { ns: meta.profile.key }],
      });
    } finally {
      setGenerating(false);
    }
  }, [invokePromise, artifact, db, provider?.id, draft]);

  // The op publishes a progress monitor under the artifact's id for as long as it runs, so a
  // generation started before this form mounted (navigated away and back, or an agent's) reads as
  // busy too — `generating` alone dies with the component.
  const running = useProgressMonitor(`${meta.profile.key}/${artifactId}`) !== undefined;

  // A produced variant with a persisted jobId is an in-flight async job whose op is no longer
  // running (a reload); resume awaiting it so a long provider poll survives (the op polls without
  // re-enqueueing). While the op still runs, it will fill the variant itself.
  const pendingIndex = useMemo(() => variants.findIndex((variant) => !!variant.jobId), [variants]);
  const pendingId = pendingIndex >= 0 ? variants[pendingIndex]?.id : undefined;
  const resumingRef = useRef(false);
  useEffect(() => {
    const pendingRef = pendingIndex >= 0 ? variantRefs[pendingIndex] : undefined;
    if (!db || !pendingRef || generating || running || resumingRef.current) {
      return;
    }
    resumingRef.current = true;
    void invokePromise(
      StudioOperation.Generate,
      { artifact: Ref.make(artifact), provider: provider?.id, variant: pendingRef },
      { spaceId: db.spaceId },
    )
      .catch((error) => log.catch(error))
      .finally(() => {
        resumingRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, pendingId, generating, running, invokePromise, artifact, provider?.id]);

  // Undo-aware removal (trashes the object, removing it from any collection + closing its plank).
  const handleDelete = useCallback(() => {
    void invokePromise(SpaceOperation.RemoveObjects, { objects: [artifact] }, { spaceId: db?.spaceId });
  }, [invokePromise, artifact, db]);

  const busy = generating || running || pendingIndex >= 0;
  // Generation is enabled only when the draft satisfies the provider's request schema (required
  // fields present, e.g. a non-empty prompt + any provider-required values).
  const canGenerate =
    !!provider &&
    Schema.is(provider.requestSchema)({ ...(provider.defaultRequest ?? {}), ...(draftSnapshot?.config ?? {}) });

  const menuActions = useMenuBuilder(
    (get) => {
      const builder = MenuBuilder.make().root({ label: ['artifact-toolbar.menu', { ns: meta.profile.key }] });

      // Generator selector (custom control).
      if (providers.length > 0) {
        builder.action(
          'generator',
          {
            variant: 'custom',
            label: ['generator.placeholder', { ns: meta.profile.key }],
            render: () => (
              <Select.Root value={provider?.id} onValueChange={handleGeneratorChange}>
                <Select.TriggerButton placeholder={t('generator.placeholder')} />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {providers.map((candidate) => (
                        <Select.Option key={candidate.id} value={candidate.id}>
                          {candidate.label}
                        </Select.Option>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            ),
          },
          () => {},
        );
      }

      // Gap pushes the connect/generate + overflow to the right end of the toolbar.
      builder.separator('gap');

      if (connected) {
        builder.action(
          'generate',
          {
            variant: 'primary',
            iconOnly: false,
            icon: busy ? 'ph--spinner-gap--regular' : 'ph--sparkle--regular',
            iconClassNames: busy ? 'animate-spin' : undefined,
            label: busy ? ['generating.label', { ns: meta.profile.key }] : ['generate.label', { ns: meta.profile.key }],
            disabled: !db || !provider || !hasAttention || busy || !canGenerate,
          },
          () => {
            void handleGenerate();
          },
        );
      } else {
        builder.subgraph(graphActions(graph, get, nodeId, { filter: isToolbarAction }));
      }

      // Overflow (object-level delete) at the end of the toolbar.
      builder.menu('more', (overflow) => {
        overflow.action(
          'delete',
          { label: ['delete.label', { ns: meta.profile.key }], icon: 'ph--trash--regular' },
          handleDelete,
        );
      });

      return builder.build();
    },
    [
      graph,
      nodeId,
      providers,
      provider,
      connected,
      busy,
      db,
      hasAttention,
      canGenerate,
      t,
      handleGeneratorChange,
      handleGenerate,
      handleDelete,
    ],
  );

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar>
        <ActionToolbar {...menuActions} onAction={runAction} attendableId={attendableId} classNames='dx-document' />
      </Panel.Toolbar>
      <Panel.Content classNames='grid grid-rows-[auto_1fr] dx-document overflow-hidden'>
        {/* MediaArtifact-level name (independent of any variant). */}
        <Flex column gap='xs' classNames='pt-3 px-2'>
          <Field.Root>
            <Field.Input
              placeholder={t('name.placeholder')}
              value={artifactSnapshot?.name ?? ''}
              onChange={handleNameChange}
            />
          </Field.Root>
        </Flex>
        {/* Schema-driven request form (prompt + kind-specific knobs, from the generator's
            requestSchema); read-only while a generation is in flight. */}
        {provider && (
          <Form.Root
            schema={provider.requestSchema}
            values={draftConfig}
            fieldMap={fieldMap}
            readonly={busy}
            hideEmpty={!busy}
            autoSave={!busy}
            onValuesChanged={busy ? undefined : handleConfigChange}
          >
            <Form.Viewport scroll>
              <Form.Content>
                <Form.Fields />
              </Form.Content>
            </Form.Viewport>
          </Form.Root>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

MediaArtifactForm.displayName = 'MediaArtifactForm';
