//
// Copyright 2026 DXOS.org
//

import React, { createContext, useContext, useEffect, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { type LighthouseClient } from '../../client/client.ts';
import { type Entity } from '../../client/types.ts';
import { type ImageRead, type InputImageRef, imageQueryIri, toImageRead } from '../../model/images.ts';
import { LighthouseNamespace } from '../../namespace.ts';

/**
 * The thread's widgets are rendered from markdown, so they reach the session's client through context: blobs and the
 * image query nodes need the API token, which an `<img src>` cannot send.
 */
export const LighthouseThreadContext = createContext<{ client?: LighthouseClient; run?: string }>({});

/** A run blob as an object URL, fetched with the client's token; undefined until it loads. */
export const useBlobUrl = (blob: string | undefined): string | undefined => {
  const { client, run } = useContext(LighthouseThreadContext);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!client || !run || !blob) {
      return;
    }
    let objectUrl: string | undefined;
    let cancelled = false;
    void EffectEx.runPromise(client.getBlob(run, blob))
      .then((data) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(data);
          setUrl(objectUrl);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [client, run, blob]);
  return url;
};

const READ_RETRY = 5_000;

/** What lighthouse read from an input image (its lh:ImageQuery node and features), polled until it is written. */
const useImageRead = (blob: string): ImageRead | undefined => {
  const { client, run } = useContext(LighthouseThreadContext);
  const [read, setRead] = useState<ImageRead>();
  useEffect(() => {
    if (!client || !run) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      const query = await EffectEx.runPromise(client.getEntity(imageQueryIri(run, blob))).catch(() => undefined);
      if (cancelled) {
        return;
      }
      if (!query) {
        timer = setTimeout(() => void load(), READ_RETRY);
        return;
      }
      const features = await Promise.all(
        (query.props['lh:imageFeature'] ?? []).map((iri) =>
          EffectEx.runPromise(client.getEntity(String(iri))).catch(() => undefined),
        ),
      );
      if (!cancelled) {
        setRead(
          toImageRead(
            query,
            features.filter((feature): feature is Entity => !!feature),
          ),
        );
      }
    };
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [client, run, blob]);
  return read;
};

const BlobImage = ({ blob, alt, className }: { blob: string; alt: string; className?: string }) => {
  const url = useBlobUrl(blob);
  return url ? (
    <img src={url} alt={alt} className={className} />
  ) : (
    <span className={`${className ?? ''} block bg-input-surface`} />
  );
};

const InputImage = ({ image }: { image: InputImageRef }) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const read = useImageRead(image.blob);
  return (
    <figure className='m-0 flex flex-col gap-2 min-w-0' data-testid='lighthouse.input-image'>
      <BlobImage
        blob={image.blob}
        alt={image.name ?? t('input-image.alt')}
        className='max-w-full w-40 max-h-56 object-contain object-left rounded-sm border border-separator'
      />
      <figcaption className='flex flex-col gap-1 text-sm min-w-0'>
        {read ? (
          <>
            <span className='font-medium'>
              {t('input-image-read.label', { title: read.title || t('input-image-item.label') })}
            </span>
            <Layout.Flex gap='xs' wrap>
              {read.features.map((feature, index) => (
                <span
                  key={index}
                  className='inline-flex items-center gap-1 ps-0.5 pe-1.5 py-0.5 rounded-sm border border-separator text-xs max-w-full'
                  title={`${feature.kind}: ${feature.label}`}
                  data-testid='lighthouse.input-image.feature'
                >
                  {feature.crop && (
                    <BlobImage
                      blob={feature.crop}
                      alt=''
                      className='size-6 shrink-0 object-contain rounded-xs bg-white'
                    />
                  )}
                  <span className='text-fg-subtle shrink-0'>{feature.kind}</span>
                  <span className='min-w-0'>{feature.label}</span>
                </span>
              ))}
            </Layout.Flex>
            {read.queries.length > 0 && (
              <span className='text-xs text-fg-subtle'>
                {t('input-image-queries.label', { queries: read.queries.join(' · ') })}
              </span>
            )}
          </>
        ) : (
          <span className='text-fg-subtle'>{t('input-image-reading.message')}</span>
        )}
      </figcaption>
    </figure>
  );
};

/** The images a person attached to an input, and what lighthouse read from each (features with their crops). */
export const InputImages = ({ images }: { images: readonly InputImageRef[] }) => (
  <Layout.Flex column gap='sm' classNames='py-1' data-testid='lighthouse.input-images'>
    {images.map((image) => (
      <InputImage key={image.blob} image={image} />
    ))}
  </Layout.Flex>
);
