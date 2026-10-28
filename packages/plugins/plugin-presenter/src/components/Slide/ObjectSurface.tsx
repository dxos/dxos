//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useEffect, useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import * as Icon from '@dxos/react-ui/Icon';

import { type SlideSurfaceRole } from '../MarkdownSlide/index.ts';

export type ObjectSurfaceProps = {
  object: Obj.Unknown;
  /** Where the fallback chain `slide` → `section` → `card` → title starts. */
  role?: SlideSurfaceRole;
  attendableId?: string;
};

const CHAIN: readonly SlideSurfaceRole[] = ['slide', 'section', 'card'];

const ROLE_TOKENS = {
  slide: AppSurface.Slide,
  section: AppSurface.Section,
  card: AppSurface.CardContent,
} as const;

/**
 * Renders an object through the first role in its fallback chain that has a surface, else as a title slide.
 */
export const ObjectSurface = ({ object, role = 'slide', attendableId }: ObjectSurfaceProps) => {
  // Subscribed so the object swaps in when a lazily gated surface registers.
  const surfaceManager = Surface.useSurfaceManager();
  const slideCandidates = useAtomValue(surfaceManager.candidatesAtom(AppSurface.Slide.role));
  const sectionCandidates = useAtomValue(surfaceManager.candidatesAtom(AppSurface.Section.role));
  const cardCandidates = useAtomValue(surfaceManager.candidatesAtom(AppSurface.CardContent.role));
  const data = useMemo(() => ({ subject: object, attendableId: attendableId ?? object.id }), [object, attendableId]);

  const chain = useMemo(() => CHAIN.slice(CHAIN.indexOf(role)), [role]);
  const available = useMemo(() => {
    const candidates = { slide: slideCandidates, section: sectionCandidates, card: cardCandidates };
    return chain.filter(
      (current) => Surface.matchCandidates(candidates[current], ROLE_TOKENS[current].role, data).length > 0,
    );
  }, [chain, slideCandidates, sectionCandidates, cardCandidates, data]);
  const selected = chain.find((current) => available.includes(current));

  // The availability check fires a role's demand on a miss, which loads gated surface modules; roles ahead
  // of the selected one are still demanded so a better surface replaces a fallback once it loads.
  const isAvailable = Surface.useIsAvailable();
  useEffect(() => {
    for (const current of chain) {
      if (current === selected) {
        break;
      }
      isAvailable({ type: ROLE_TOKENS[current], data });
    }
  }, [chain, selected, isAvailable, data]);

  switch (selected) {
    case 'slide':
      return <Surface.Surface type={AppSurface.Slide} data={data} limit={1} />;
    case 'section':
      return <Surface.Surface type={AppSurface.Section} data={data} limit={1} />;
    case 'card':
      return <Surface.Surface type={AppSurface.CardContent} data={data} limit={1} />;
    default:
      return <TitleSlide object={object} />;
  }
};

/** Shown when no surface in the chain renders the object. */
const TitleSlide = ({ object }: { object: Obj.Unknown }) => {
  const icon = Obj.getIcon(object)?.icon ?? 'ph--cube--regular';
  return (
    <div className='flex flex-col grow h-full items-center justify-center gap-8 text-8xl'>
      <Icon.Icon icon={icon} classNames='size-48' />
      <span>{Obj.getLabel(object)}</span>
    </div>
  );
};
