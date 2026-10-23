//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';

import { meta } from '#meta';

import { type SlideSurfaceRole } from '../MarkdownSlide/index.ts';
import { ObjectSurface } from './ObjectSurface.tsx';

export type EmbeddedSurfaceProps = {
  /** The object's ECHO URI from `<Surface ref>`; anything else renders the missing placeholder. */
  uri: string;
  role: SlideSurfaceRole;
  /** The slide owner's database, against which space-relative refs resolve. */
  db: Database.Database;
};

/**
 * Renders the object a slide's `<Surface ref>` names, or a placeholder when it is malformed, missing or deleted.
 */
export const EmbeddedSurface = ({ uri, role, db }: EmbeddedSurfaceProps) => {
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
    return <ObjectSurface object={object} role={role} />;
  }
  if (!ref || missing || object) {
    return <MissingObject />;
  }
  return <Pending />;
};

const MissingObject = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <div
      data-testid='presenter.embedded-surface.missing'
      className='flex grow items-center justify-center gap-6 p-8 border-4 border-dashed border-separator text-[32px] text-description'
    >
      <Icon.Icon icon='ph--warning--regular' classNames='size-12' />
      <span>{t('missing-object.label')}</span>
    </div>
  );
};

const Pending = () => (
  <div data-testid='presenter.embedded-surface.loading' className='flex grow items-center justify-center'>
    <Icon.Icon icon='ph--circle-notch--regular' spin classNames='size-16' />
  </div>
);
