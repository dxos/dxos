//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Connection, ConnectorAuth } from '@dxos/plugin-connector';
import { useQuery } from '@dxos/react-client/echo';
import { Button, DropdownMenu, Icon, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { type Text } from '@dxos/schema';

import { PromptEditor, VariantGallery } from '#components';
import { meta } from '#meta';
import { GenerateForm, VariantRenderer } from '#surfaces';
import { type Artifact, StudioCapabilities, StudioOperation } from '#types';

export type ArtifactArticleProps = AppSurface.ObjectArticleProps<Artifact.Artifact>;

type Selected = 'all' | number;

/**
 * Media-agnostic article surface for an {@link Artifact}: a Toolbar with per-variant tabs (plus an
 * "All" gallery tab) and a Connect/Generate action — the Generate button opens a menu of the kind's
 * generators and picking one generates. Below: the editable prompt, the kind-specific request form (a
 * schema-driven {@link GenerateForm} surface, overridable per kind), and the selected variant
 * (rendered via the {@link VariantRenderer} surface for its contentType) or the gallery.
 */
export const ArtifactArticle = ({ role, subject: artifact, attendableId }: ArtifactArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const isSurfaceAvailable = Surface.useIsAvailable();
  const { invokePromise } = useOperationInvoker();

  const db = Obj.getDatabase(artifact);

  // Providers for the artifact's kind; a Generator selector lets the user pick among them.
  const services = useCapabilities(StudioCapabilities.GenerationService);
  const providers = useMemo(
    () => services.filter((candidate) => candidate.kind === artifact.kind),
    [services, artifact.kind],
  );

  // Reactive view of the artifact's variants + config.
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
  const galleryItems = useMemo(
    () =>
      variants.map((variant) => ({
        id: variant.id,
        url: variant.url,
        content: variant.content,
        contentType: variant.contentType,
        label: variant.generation?.prompt ?? undefined,
      })),
    [variants],
  );

  // Load the live prompt Text object (edits persist to its content).
  const artifactId = artifact.id;
  const [promptText, setPromptText] = useState<Text.Text>();
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const instructions = await artifact.instructions.load();
        const text = await instructions.text.load();
        if (!cancelled) {
          setPromptText(text);
        }
      } catch (error) {
        log.catch(error);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifactId]);

  const [selected, setSelected] = useState<Selected>('all');
  const [generating, setGenerating] = useState(false);

  // Connector-managed credential: show the "Connect" button until the provider's connection exists.
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const isConnected = useCallback(
    (candidate: { connectorId?: string }) =>
      !candidate.connectorId || connections.some((connection) => connection.connectorId === candidate.connectorId),
    [connections],
  );
  const connected = provider ? isConnected(provider) : true;
  const connectorData = useMemo(
    () => (provider?.connectorId ? { connectorIds: [provider.connectorId] } : undefined),
    [provider?.connectorId],
  );
  const showConnect = !!connectorData && !connected && isSurfaceAvailable({ type: ConnectorAuth, data: connectorData });

  // The kind-specific request config (validated against the provider's requestSchema).
  const configValue = useMemo<Record<string, unknown>>(
    () => ({ ...(provider?.defaultRequest ?? {}), ...(artifactSnapshot?.config ?? {}) }),
    [provider?.defaultRequest, artifactSnapshot?.config],
  );
  const handleConfigChange = useCallback(
    (next: Record<string, unknown>) => {
      Obj.update(artifact, (artifact) => {
        artifact.config = next;
      });
    },
    [artifact],
  );

  const handleGenerate = useCallback(
    async (providerId?: string) => {
      if (!db) {
        return;
      }
      setGenerating(true);
      try {
        await invokePromise(
          StudioOperation.Generate,
          { artifact: Ref.make(artifact), provider: providerId ?? provider?.id },
          { spaceId: db.spaceId },
        );
        setSelected('all');
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
    },
    [invokePromise, artifact, db, provider?.id],
  );

  // Resume an in-flight asynchronous generation (persisted jobId) on mount so a long provider poll
  // survives navigation/remount. The generate op detects the stored jobId and polls (no re-enqueue).
  const resumingRef = useRef(false);
  const inFlightJobId = artifactSnapshot?.jobId;
  useEffect(() => {
    if (!db || !inFlightJobId || generating || resumingRef.current) {
      return;
    }
    resumingRef.current = true;
    void handleGenerate().finally(() => {
      resumingRef.current = false;
    });
  }, [db, inFlightJobId, generating, handleGenerate]);

  // Picking a generator from the menu persists it and generates immediately; if it needs a
  // credential we only select it (the toolbar then surfaces the Connect action for that provider).
  const handleSelectGenerator = useCallback(
    (candidate: { id: string; connectorId?: string }) => {
      handleGeneratorChange(candidate.id);
      if (isConnected(candidate)) {
        void handleGenerate(candidate.id);
      }
    },
    [handleGeneratorChange, isConnected, handleGenerate],
  );

  const selectedVariant = typeof selected === 'number' ? variants[selected] : undefined;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        {/* TODO(burdon): Use toolbar idiom. */}
        <Toolbar.Root classNames='dx-document'>
          <Button variant={selected === 'all' ? 'primary' : 'ghost'} onClick={() => setSelected('all')}>
            {t('all.tab.label')}
          </Button>
          {variants.map((variant, index) => (
            <Button
              key={variant.id}
              variant={selected === index ? 'primary' : 'ghost'}
              onClick={() => setSelected(index)}
            >
              {index + 1}
            </Button>
          ))}
          <Toolbar.Separator />
          {showConnect && connectorData ? (
            // TODO(burdon): Inject via capability.
            <Surface.Surface type={ConnectorAuth} data={connectorData} limit={1} />
          ) : (
            // A single Generate button opens a menu of the kind's generators; picking one generates.
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <IconButton
                  variant='primary'
                  icon={generating ? 'ph--spinner-gap--regular' : 'ph--sparkle--regular'}
                  iconClassNames={generating ? 'animate-spin' : undefined}
                  label={generating ? t('generating.label') : t('generate.label')}
                  disabled={!db || providers.length === 0 || !hasAttention || generating}
                />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align='end'>
                  <DropdownMenu.Viewport>
                    {providers.map((candidate) => (
                      <DropdownMenu.Item key={candidate.id} onClick={() => handleSelectGenerator(candidate)}>
                        <Icon
                          icon={provider?.id === candidate.id ? 'ph--check--regular' : 'ph--sparkle--regular'}
                          size={4}
                        />
                        <span className='grow'>{candidate.label}</span>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Viewport>
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='grid grid-rows-[auto_1fr] p-2 gap-2'>
        <div role='none' className='grid grid-rows-[6lh_1fr] gap-2 shrink-0 dx-document'>
          <PromptEditor
            id={`${artifactId}/prompt`}
            text={promptText}
            placeholder={t('prompt.placeholder')}
            compact
            classNames='border border-separator rounded p-2'
          />
          {provider && (
            <Surface.Surface
              type={GenerateForm}
              data={{
                kind: artifact.kind,
                schema: provider.requestSchema,
                value: configValue,
                onChange: handleConfigChange,
              }}
              limit={1}
            />
          )}
        </div>
        <div role='none' className='grow min-bs-0 overflow-auto'>
          {selected === 'all' ? (
            <VariantGallery variants={galleryItems} emptyMessage={t('empty.message')} />
          ) : selectedVariant ? (
            <Surface.Surface
              type={VariantRenderer}
              data={{
                variant: {
                  contentType: selectedVariant.contentType,
                  url: selectedVariant.url,
                  content: selectedVariant.content,
                  generation: selectedVariant.generation,
                },
                contentType: selectedVariant.contentType ?? provider?.contentType ?? '',
              }}
              limit={1}
            />
          ) : (
            <div role='status' className='flex items-center justify-center bs-full text-subdued'>
              {t('empty.message')}
            </div>
          )}
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

ArtifactArticle.displayName = 'ArtifactArticle';
