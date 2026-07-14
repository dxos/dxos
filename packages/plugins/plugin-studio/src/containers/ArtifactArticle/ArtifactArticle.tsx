//
// Copyright 2026 DXOS.org
//

import React, { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Connection, ConnectorAuth } from '@dxos/plugin-connector';
import { SpaceOperation } from '@dxos/plugin-space';
import { useQuery } from '@dxos/react-client/echo';
import { Button, DropdownMenu, Icon, IconButton, Input, Panel, Select, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { type Text } from '@dxos/schema';

import { GenerateForm, PromptEditor, VariantGallery } from '#components';
import { meta } from '#meta';
import { VariantRenderer } from '#surfaces';
import { type Artifact, StudioCapabilities, StudioOperation, Variant } from '#types';

export type ArtifactArticleProps = AppSurface.ObjectArticleProps<Artifact.Artifact>;

/** `'all'` gallery, `'draft'` compose tab, or the index of a produced (frozen) variant. */
type Selected = 'all' | 'draft' | number;

/**
 * Media-agnostic article surface for an {@link Artifact}. The toolbar has an "All" gallery tab, a
 * "Draft" compose tab, and a tab per produced {@link Variant}, plus a generator selector +
 * Connect/Generate action and an overflow menu (Delete). The properties panel (prompt + kind-specific
 * request form) binds to the current selection: the editable in-memory draft variant for
 * "Draft"/"All", or the selected produced variant read-only (frozen once generated). Generating
 * consumes the draft to append a new frozen variant; the draft persists for the next compose.
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

  // Reactive view of the artifact's variants.
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
        label: variant.name ?? variant.generation?.prompt ?? undefined,
      })),
    [variants],
  );

  // Load the live prompt Text object (edits persist to its content); shown editable while composing.
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

  // In-memory draft variant (never added to the db): the editable compose surface. Reset when the
  // generator changes so it seeds from the new provider's default config.
  const draft = useMemo(
    () => Variant.make({ config: { ...(provider?.defaultRequest ?? {}) } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [artifactId, provider?.id],
  );

  const [selected, setSelected] = useState<Selected>('draft');
  const [generating, setGenerating] = useState(false);

  const selectedVariant = typeof selected === 'number' ? variants[selected] : undefined;
  // "All" and "Draft" compose against the editable draft; a numbered tab inspects a frozen variant.
  const composing = !selectedVariant;
  // The provider supplies its own request-config form (e.g. HeyGen's avatar/voice pickers), else the
  // schema-driven default.
  const FormComponent = provider?.Form ?? GenerateForm;

  // Connector-managed credential: show the "Connect" button until the provider's connection exists.
  const connections = useQuery(db, Filter.type(Connection.Connection));
  const connected = provider?.connectorId
    ? connections.some((connection) => connection.connectorId === provider.connectorId)
    : true;
  const connectorData = useMemo(
    () => (provider?.connectorId ? { connectorIds: [provider.connectorId] } : undefined),
    [provider?.connectorId],
  );
  const showConnect = !!connectorData && !connected && isSurfaceAvailable({ type: ConnectorAuth, data: connectorData });

  // The draft's request config (provider defaults overlaid with the draft's edits).
  const draftConfig = useMemo<Record<string, unknown>>(
    () => ({ ...(provider?.defaultRequest ?? {}), ...(draft.config ?? {}) }),
    [provider?.defaultRequest, draft],
  );
  const handleConfigChange = useCallback(
    (next: Record<string, unknown>) => {
      Obj.update(draft, (draft) => {
        draft.config = next;
      });
    },
    [draft],
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
    const producedIndex = variants.length;
    setGenerating(true);
    try {
      await invokePromise(
        StudioOperation.Generate,
        { artifact: Ref.make(artifact), provider: provider?.id, name: draft.name, config: draft.config },
        { spaceId: db.spaceId },
      );
      setSelected(producedIndex);
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
  }, [invokePromise, artifact, db, provider?.id, draft, variants.length]);

  // A produced variant with a persisted jobId is an in-flight async job; resume awaiting it on mount
  // so a long provider poll survives navigation/remount (the op polls without re-enqueueing).
  const pendingIndex = useMemo(() => variants.findIndex((variant) => !!variant.jobId), [variants]);
  const pendingId = pendingIndex >= 0 ? variants[pendingIndex]?.id : undefined;
  const resumingRef = useRef(false);
  useEffect(() => {
    const pendingRef = pendingIndex >= 0 ? variantRefs[pendingIndex] : undefined;
    if (!db || !pendingRef || generating || resumingRef.current) {
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
  }, [db, pendingId, generating, invokePromise, artifact, provider?.id]);

  // Undo-aware removal (trashes the object, removing it from any collection + closing its plank).
  const handleDelete = useCallback(() => {
    void invokePromise(SpaceOperation.RemoveObjects, { objects: [artifact] });
  }, [invokePromise, artifact]);

  const busy = generating || pendingIndex >= 0;
  const selectedGeneration = selectedVariant?.generation;

  // Whether the selected variant is the artifact's cover; toggling designates (or clears) it.
  const isCover = !!selectedVariant && artifactSnapshot?.cover?.target?.id === selectedVariant.id;
  const handleCoverChange = useCallback(
    (checked: boolean) => {
      if (typeof selected !== 'number') {
        return;
      }
      const ref = variantRefs[selected];
      Obj.update(artifact, (artifact) => {
        artifact.cover = checked ? ref : undefined;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [artifact, selected],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        {/* TODO(burdon): Use toolbar idiom. */}
        <Toolbar.Root classNames='dx-document'>
          <Button variant={selected === 'all' ? 'primary' : 'ghost'} onClick={() => setSelected('all')}>
            {t('all.tab.label')}
          </Button>
          <IconButton
            iconOnly
            icon='ph--pencil-simple--regular'
            label={t('draft.label')}
            variant={selected === 'draft' ? 'primary' : 'ghost'}
            onClick={() => setSelected('draft')}
          />
          {variants.map((variant, index) => (
            <Button
              key={variant.id}
              variant={selected === index ? 'primary' : 'ghost'}
              onClick={() => setSelected(index)}
            >
              {variant.jobId ? <Icon icon='ph--spinner-gap--regular' size={4} classNames='animate-spin' /> : index + 1}
            </Button>
          ))}
          <Toolbar.Separator />
          {providers.length > 0 && (
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
          )}
          {showConnect && connectorData ? (
            // TODO(burdon): Inject via capability.
            <Surface.Surface type={ConnectorAuth} data={connectorData} limit={1} />
          ) : (
            <IconButton
              variant='primary'
              icon={busy ? 'ph--spinner-gap--regular' : 'ph--sparkle--regular'}
              iconClassNames={busy ? 'animate-spin' : undefined}
              label={busy ? t('generating.label') : t('generate.label')}
              disabled={!db || !provider || !hasAttention || busy || !composing}
              onClick={() => {
                void handleGenerate();
              }}
            />
          )}
          {/* Overflow menu at the end of the toolbar (object-level actions). */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <IconButton variant='ghost' icon='ph--dots-three-vertical--regular' iconOnly label={t('more.label')} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align='end'>
                <DropdownMenu.Viewport>
                  <DropdownMenu.Item onClick={handleDelete}>
                    <Icon icon='ph--trash--regular' size={4} />
                    <span className='grow'>{t('delete.label')}</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Viewport>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='grid grid-rows-[1fr_1fr] gap-2'>
        <div className='grid grid-rows-[6lh_1fr] py-2 gap-2 dx-document'>
          <PromptEditor
            classNames='border border-separator rounded p-2'
            id={selectedVariant ? `${artifactId}/variant/${selectedVariant.id}/prompt` : `${artifactId}/prompt`}
            text={composing ? promptText : undefined}
            value={composing ? undefined : selectedGeneration?.prompt}
            readonly={!composing}
            placeholder={t('prompt.placeholder')}
            compact
          />
          <div className='flex flex-col'>
            {/* A produced (frozen) variant can be designated the artifact's cover default. */}
            <div className=''>
              {selectedVariant && !selectedVariant.jobId && (
                <Input.Root>
                  <div className='flex items-center gap-2'>
                    <Input.Checkbox
                      checked={isCover}
                      onCheckedChange={(checked) => handleCoverChange(checked === true)}
                    />
                    <Input.Label>{t('cover.label')}</Input.Label>
                  </div>
                </Input.Root>
              )}
            </div>
            {/* Artifact-level name (independent of the selected variant). */}
            <Input.Root>
              <Input.TextInput
                placeholder={t('name.placeholder')}
                value={artifactSnapshot?.name ?? ''}
                onChange={handleNameChange}
              />
            </Input.Root>
            {/* The provider's request-config form (its own `Form`, else the schema-driven default),
                inlined. Composing edits the draft; a produced variant is shown read-only. */}
            {provider && (
              <FormComponent
                key={composing ? 'draft' : selectedVariant?.id}
                schema={provider.requestSchema}
                value={composing ? draftConfig : (selectedVariant?.config ?? {})}
                onChange={composing ? handleConfigChange : undefined}
                readonly={!composing}
              />
            )}
          </div>
        </div>
        <div className='dx-container border-t border-subdued-separator'>
          {selected === 'all' ? (
            <VariantGallery
              variants={galleryItems}
              emptyMessage={t('empty.message')}
              onSelect={(id) => {
                const index = variants.findIndex((variant) => variant.id === id);
                if (index >= 0) {
                  setSelected(index);
                }
              }}
            />
          ) : (
            selectedVariant &&
            (selectedVariant.jobId ? (
              <div role='status' className='flex items-center justify-center bs-full text-subdued'>
                {t('generating.label')}
              </div>
            ) : (
              <div className='dx-expander p-2'>
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
              </div>
            ))
          )}
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};

ArtifactArticle.displayName = 'ArtifactArticle';
