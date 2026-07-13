//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Surface, useCapabilities, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Connection, ConnectorAuth } from '@dxos/plugin-connector';
import { useQuery } from '@dxos/react-client/echo';
import { Button, IconButton, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { type Text } from '@dxos/schema';
import { type File } from '@dxos/types';

import { ImageGallery, type ImageSource, ImageView, PromptEditor } from '#components';
import { meta } from '#meta';
import { Image, type ImageArtifact, ImageArtifactOperation, StudioCapabilities } from '#types';

import { useFileUpload } from '../../hooks';

export type ImageArtifactArticleProps = AppSurface.ObjectArticleProps<ImageArtifact.ImageArtifact>;

type Selected = 'all' | number;

/**
 * Main article surface for an ImageArtifact: a Toolbar with per-image tabs (plus an "All" gallery
 * tab), Upload + Connect/Generate actions, the editable prompt below, and the selected image (or the
 * gallery) below that. Images may be generated (remote URL) or uploaded (file blob).
 */
export const ImageArtifactArticle = ({ role, subject: artifact, attendableId }: ImageArtifactArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { hasAttention } = useAttention(attendableId);
  const pluginManager = usePluginManager();
  const { invokePromise } = useOperationInvoker();

  const db = Obj.getDatabase(artifact);
  const providers = useCapabilities(StudioCapabilities.ImageGenerationService);
  const provider = providers[0];

  // Reactive view of the artifact's images.
  const [artifactSnapshot] = useObject(artifact);
  const imageRefs = artifactSnapshot?.images ?? [];
  const images = useObjects(imageRefs);
  const imageSources = useMemo<ImageSource[]>(
    () => images.map((image) => ({ url: image.url, file: image.file, name: image.prompt ?? undefined })),
    [images],
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
  const connected = provider?.connectorId
    ? connections.some((connection) => connection.connectorId === provider.connectorId)
    : true;
  const connectorData = useMemo(
    () => (provider?.connectorId ? { connectorIds: [provider.connectorId] } : undefined),
    [provider?.connectorId],
  );
  const showConnect =
    !!connectorData &&
    !connected &&
    Surface.isAvailable(pluginManager.capabilities, { type: ConnectorAuth, data: connectorData });

  const handleGenerate = useCallback(async () => {
    if (!db) {
      return;
    }
    setGenerating(true);
    try {
      await invokePromise(
        ImageArtifactOperation.GenerateImage,
        { artifact: Ref.make(artifact) },
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
  }, [invokePromise, artifact, db]);

  // Uploaded images become file-backed Image objects owned by the artifact.
  const handleUpload = useCallback(
    (uploaded: File.File) => {
      if (!db) {
        return;
      }
      const image = Image.make({ file: Ref.make(uploaded) });
      Obj.setParent(image, artifact);
      db.add(image);
      Obj.update(artifact, (artifact) => {
        artifact.images = [...(artifact.images ?? []), Ref.make(image)];
      });
      setSelected('all');
    },
    [db, artifact],
  );
  const upload = useFileUpload({ subject: artifact, accept: 'image/*', multiple: true, onUpload: handleUpload });

  const selectedImage = typeof selected === 'number' ? images[selected] : undefined;

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Button variant={selected === 'all' ? 'primary' : 'ghost'} onClick={() => setSelected('all')}>
            {t('all.tab.label')}
          </Button>
          {images.map((image, index) => (
            <Button
              key={image.id}
              variant={selected === index ? 'primary' : 'ghost'}
              onClick={() => setSelected(index)}
            >
              {index + 1}
            </Button>
          ))}
          <div role='none' className='grow' />
          <IconButton
            icon='ph--upload-simple--regular'
            label={t('upload.label')}
            disabled={!upload.enabled}
            onClick={() => upload.open()}
          />
          {showConnect && connectorData ? (
            <Surface.Surface type={ConnectorAuth} data={connectorData} limit={1} />
          ) : (
            <IconButton
              variant='primary'
              icon={generating ? 'ph--spinner-gap--regular' : 'ph--sparkle--regular'}
              iconClassNames={generating ? 'animate-spin' : undefined}
              label={generating ? t('generating.label') : t('generate.label')}
              disabled={!db || !provider || !hasAttention || generating}
              onClick={() => {
                void handleGenerate();
              }}
            />
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='grid grid-rows-[8rem_1fr] p-2'>
        <PromptEditor
          id={`${artifactId}/prompt`}
          text={promptText}
          placeholder={t('prompt.placeholder')}
          classNames='shrink-0 border border-separator rounded p-2 max-bs-32 overflow-auto'
        />
        <div role='none' className='grow min-bs-0'>
          {selected === 'all' ? (
            <ImageGallery images={imageSources} emptyMessage={t('empty.message')} />
          ) : (
            <ImageView
              image={
                selectedImage && {
                  url: selectedImage.url,
                  file: selectedImage.file,
                  prompt: selectedImage.prompt,
                  model: selectedImage.model,
                  resolution: selectedImage.resolution,
                  seed: selectedImage.seed,
                }
              }
            />
          )}
        </div>
        {upload.input}
      </Panel.Content>
    </Panel.Root>
  );
};

ImageArtifactArticle.displayName = 'ImageArtifactArticle';
