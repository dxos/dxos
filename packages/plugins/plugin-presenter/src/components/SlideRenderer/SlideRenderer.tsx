//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useEffect } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { type Text } from '@dxos/schema';

import { type SlideSource } from '#deck';
import { meta } from '#meta';

import { Slide } from '../Slide/index.ts';
import { SlideFrame } from '../SlideFrame/index.ts';

export type SlideRendererProps = {
  source: SlideSource;
  attendableId?: string;
};

/**
 * Renders one deck slide inside its scaled frame, whatever the slide's source.
 */
export const SlideRenderer = ({ source, attendableId }: SlideRendererProps) => {
  switch (source.kind) {
    case 'text':
      return <TextSlide text={source.text} />;
    case 'object':
      return <ObjectSlide object={source.object} attendableId={attendableId} />;
    case 'pending':
      return <PendingSlide />;
  }
};

const TextSlide = ({ text }: { text: Text.Text }) => {
  const [content] = useObject(text, 'content');
  return (
    <SlideFrame>
      <Slide content={content} />
    </SlideFrame>
  );
};

const ObjectSlide = ({ object, attendableId }: { object: Obj.Unknown; attendableId?: string }) => {
  // Subscribed so the slide swaps in when a lazily gated surface registers.
  const surfaceManager = Surface.useSurfaceManager();
  const candidates = useAtomValue(surfaceManager.candidatesAtom(AppSurface.Slide.role));
  const data = { subject: object, attendableId: attendableId ?? object.id };
  const available = Surface.matchCandidates(candidates, AppSurface.Slide.role, data).length > 0;

  // The availability check fires the role's demand on a miss, which loads gated surface modules.
  const isAvailable = Surface.useIsAvailable();
  useEffect(() => {
    if (!available) {
      isAvailable({ type: AppSurface.Slide, data });
    }
  }, [available, isAvailable, object]);

  return (
    <SlideFrame>
      {available ? <Surface.Surface type={AppSurface.Slide} data={data} limit={1} /> : <TitleSlide object={object} />}
    </SlideFrame>
  );
};

/** Shown when no surface renders the object as a slide. */
const TitleSlide = ({ object }: { object: Obj.Unknown }) => {
  const icon = Obj.getIcon(object)?.icon ?? 'ph--cube--regular';
  return (
    <div className='flex flex-col grow h-full items-center justify-center gap-8 text-8xl'>
      <Icon.Icon icon={icon} classNames='size-48' />
      <span>{Obj.getLabel(object)}</span>
    </div>
  );
};

const PendingSlide = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <SlideFrame>
      <div className='flex grow h-full items-center justify-center gap-6 text-6xl'>
        <Icon.Icon icon='ph--circle-notch--regular' spin classNames='size-16' />
        <span>{t('slide-pending.label')}</span>
      </div>
    </SlideFrame>
  );
};
