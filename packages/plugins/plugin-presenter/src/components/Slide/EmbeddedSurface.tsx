//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { Text } from '@dxos/schema';

import { meta } from '#meta';
import { Presentation } from '#types';

import { MarkdownSlide, type SlideSurfaceRole } from '../MarkdownSlide/index.ts';
import { SlideCanvas } from './canvas.tsx';
import { ObjectSurface } from './ObjectSurface.tsx';

export type EmbeddedSurfaceProps = {
  /** The object's ECHO URI from `<Surface ref>`; anything else renders the missing placeholder. */
  uri: string;
  role: SlideSurfaceRole;
  /** The slide owner's database; a space-qualified ref (`echo://<space>/<id>`) resolves only while that space is open in the client, else the missing placeholder. */
  db: Database.Database;
};

/** Deepest chain of nested embeds rendered; anything deeper shows the recursion placeholder. */
const MAX_EMBED_DEPTH = 3;

/** Ids of the objects enclosing the current embed, outermost first. */
const EmbedAncestorsContext = createContext<readonly string[]>([]);

/**
 * Marks `id` as enclosing its children, so an embed of it (directly or through a cycle) renders a placeholder
 * instead of recursing without limit.
 */
export const EmbedAncestor = ({ id, children }: PropsWithChildren<{ id: string | undefined }>) => {
  const ancestors = useContext(EmbedAncestorsContext);
  const value = useMemo(
    () => (id === undefined || ancestors.includes(id) ? ancestors : [...ancestors, id]),
    [ancestors, id],
  );
  return <EmbedAncestorsContext.Provider value={value}>{children}</EmbedAncestorsContext.Provider>;
};

/**
 * Renders the object a slide's `<Surface ref>` names, or a placeholder when it is malformed, missing or deleted.
 */
export const EmbeddedSurface = ({ uri, role, db }: EmbeddedSurfaceProps) => {
  const ancestors = useContext(EmbedAncestorsContext);
  const ref = useMemo(() => {
    const eid = EID.tryParse(uri);
    return eid ? db.makeRef<Obj.Unknown>(eid) : undefined;
  }, [uri, db]);
  const object = useResolveRef(ref);
  // Subscribes so deleting the target re-renders the placeholder.
  useObject(object);

  // `object` is undefined both while loading and when there is nothing to load; only a settled load tells them apart.
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    setMissing(false);
    if (!ref) {
      return;
    }
    let cancelled = false;
    ref.tryLoad().then(
      (target: Obj.Unknown | undefined) => !cancelled && setMissing(!target || Obj.isDeleted(target)),
      () => !cancelled && setMissing(true),
    );
    return () => {
      cancelled = true;
    };
  }, [ref]);

  if (object && !Obj.isDeleted(object)) {
    if (ancestors.includes(object.id) || ancestors.length > MAX_EMBED_DEPTH) {
      return <Placeholder testId='presenter.embedded-surface.recursive' label='recursive-embed.label' />;
    }
    // A Slide (e.g. another deck's) shows its content.
    if (Obj.instanceOf(Presentation.Slide, object)) {
      return (
        <EmbedAncestor id={object.id}>
          <EmbeddedSlideObject slide={object} role={role} />
        </EmbedAncestor>
      );
    }
    // A Text is a slide's own markdown (e.g. another deck's owned slide); its surfaces are text editors, not slides.
    if (Obj.instanceOf(Text.Text, object)) {
      return <EmbeddedTextSlide text={object} />;
    }
    return (
      <EmbedAncestor id={object.id}>
        <ObjectSurface object={object} role={role} />
      </EmbedAncestor>
    );
  }
  if (!ref || missing || object) {
    return <Placeholder testId='presenter.embedded-surface.missing' label='missing-object.label' />;
  }
  return <Pending />;
};

/** A slide's content: its markdown as a slide, or the linked object through its slide surface. */
const EmbeddedSlideObject = ({ slide, role }: { slide: Presentation.Slide; role: SlideSurfaceRole }) => {
  const content = useResolveRef(slide.content);
  if (!content || Obj.isDeleted(content)) {
    return <Pending />;
  }
  return Obj.instanceOf(Text.Text, content) ? (
    <EmbeddedTextSlide text={content} />
  ) : (
    <ObjectSurface object={content} role={role} />
  );
};

/** Renders an embedded Text as a scaled slide; its own `<Surface>`s stay placeholders so a self-reference cannot recurse. */
const EmbeddedTextSlide = ({ text }: { text: Text.Text }) => {
  const [content] = useObject(text, 'content');
  return (
    <SlideCanvas>
      <MarkdownSlide content={content ?? ''} />
    </SlideCanvas>
  );
};

const Placeholder = ({ testId, label }: { testId: string; label: string }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <div
      data-testid={testId}
      className='flex grow items-center justify-center gap-6 p-8 border-4 border-dashed border-separator text-[32px] text-description'
    >
      <Icon.Icon icon='ph--warning--regular' classNames='size-12' />
      <span>{t(label)}</span>
    </div>
  );
};

const Pending = () => (
  <div data-testid='presenter.embedded-surface.loading' className='flex grow items-center justify-center'>
    <Icon.Icon icon='ph--circle-notch--regular' spin classNames='size-16' />
  </div>
);
