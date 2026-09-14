//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { useObject, useObjects } from '@dxos/echo-react';
import { Button, Field, Flex, Icon, Panel, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { VariantGallery } from '#components';
import { meta } from '#meta';
import { VariantRenderer } from '#surfaces';
import { type MediaArtifact } from '#types';

/** A host's Play control, appended to the toolbar when given (a storyboard playing its frames). */
export type PlayControl = {
  disabled?: boolean;
  onPlay: () => void;
};

export type MediaArtifactVariantsProps = ThemedClassName<{
  artifact: MediaArtifact.MediaArtifact;
  attendableId?: string;
  play?: PlayControl;
}>;

/** `'all'` gallery, or the index of a produced (frozen) variant. */
type Selected = 'all' | number;

/**
 * The produced side of a {@link MediaArtifact}: a toolbar with an "All" gallery tab and a tab per
 * produced variant, the gallery or the selected variant rendered through the variant surface, and
 * — for a produced variant — the cover toggle and delete. Opens on the cover; a variant that is
 * still generating shows as a spinner tab, and the newest variant is selected as it lands, so a
 * Generate in the form ends on its result. A host's `play` becomes the toolbar's last action.
 */
export const MediaArtifactVariants = ({ classNames, artifact, attendableId, play }: MediaArtifactVariantsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(artifact);
  const [artifactSnapshot] = useObject(artifact);
  const variantRefs = artifactSnapshot?.variants ?? [];
  const variants = useObjects(variantRefs);
  const galleryItems = useMemo(
    () =>
      variants.map((variant) => ({
        id: variant.id,
        url: variant.url,
        content: variant.content,
        contentType: variant.contentType,
        label: variant.name ?? variant.generation?.prompt,
      })),
    [variants],
  );

  // Opens on the cover (the artifact's chosen picture) until the reader picks a tab; `undefined`
  // rather than a default so a cover that resolves after mount still wins.
  const [picked, setSelected] = useState<Selected | undefined>();
  const coverId = artifactSnapshot?.cover?.target?.id;
  const coverIndex = variants.findIndex((variant) => variant.id === coverId);
  const selected: Selected = picked ?? (coverIndex >= 0 ? coverIndex : 'all');
  const selectedVariant = typeof selected === 'number' ? variants[selected] : undefined;

  // A variant appended since the last render is the one just generated: show it.
  const countRef = useRef(variants.length);
  useEffect(() => {
    if (variants.length > countRef.current) {
      setSelected(variants.length - 1);
    }
    countRef.current = variants.length;
  }, [variants.length]);

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

  // Remove the selected variant: detach it from the artifact (clearing the cover if it was it) and
  // delete the owned object, then fall back to the gallery.
  const handleDeleteVariant = useCallback(() => {
    if (!db || typeof selected !== 'number') {
      return;
    }
    const ref = variantRefs[selected];
    const target = ref?.target;
    if (!target) {
      return;
    }
    Obj.update(artifact, (artifact) => {
      artifact.variants = (artifact.variants ?? []).filter((variant) => variant.target?.id !== target.id);
      if (artifact.cover?.target?.id === target.id) {
        artifact.cover = undefined;
      }
    });
    db.remove(target);
    setSelected('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, selected, artifact]);

  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make().root({ label: ['variants-toolbar.menu', { ns: meta.profile.key }] });
    // Segmented tab strip (All / one per produced variant), custom-rendered to keep the buttons.
    builder.action(
      'tabs',
      {
        variant: 'custom',
        label: ['all.tab.label', { ns: meta.profile.key }],
        render: () => (
          <>
            <Button variant={selected === 'all' ? 'primary' : 'ghost'} onClick={() => setSelected('all')}>
              {t('all.tab.label')}
            </Button>
            {variants.map((variant, index) => (
              <Button
                key={variant.id}
                variant={selected === index ? 'primary' : 'ghost'}
                onClick={() => setSelected(index)}
              >
                {variant.jobId ? (
                  <Icon icon='ph--spinner-gap--regular' size={4} classNames='animate-spin' />
                ) : (
                  index + 1
                )}
              </Button>
            ))}
          </>
        ),
      },
      () => {},
    );
    builder.separator('gap');
    if (selectedVariant && !selectedVariant.jobId) {
      builder.action(
        'cover',
        {
          variant: 'custom',
          label: ['cover.label', { ns: meta.profile.key }],
          render: () => (
            <Field.Checkbox checked={isCover} onCheckedChange={(checked) => handleCoverChange(checked === true)}>
              {t('cover.label')}
            </Field.Checkbox>
          ),
        },
        () => {},
      );
    }
    if (play) {
      builder.action(
        'play',
        {
          label: ['play.label', { ns: meta.profile.key }],
          icon: 'ph--play--regular',
          disposition: 'toolbar',
          disabled: play.disabled,
        },
        play.onPlay,
      );
    }
    return builder.build();
  }, [selected, variants, selectedVariant, isCover, play, t, handleCoverChange]);

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Panel.Toolbar>
      <Panel.Content>
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
            <Flex role='status' center classNames='h-full text-subdued'>
              {t('generating.label')}
            </Flex>
          ) : (
            <Surface.Surface
              type={VariantRenderer}
              data={{
                variant: {
                  contentType: selectedVariant.contentType,
                  url: selectedVariant.url,
                  content: selectedVariant.content,
                  generation: selectedVariant.generation,
                },
                contentType: selectedVariant.contentType ?? '',
              }}
              limit={1}
            />
          ))
        )}
      </Panel.Content>
    </Panel.Root>
  );
};

MediaArtifactVariants.displayName = 'MediaArtifactVariants';
