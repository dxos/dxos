//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { clearTimeTravel, setTimeTravel } from '@dxos/echo-client';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { HistoryScrubber } from '@dxos/react-ui-components';

import { meta } from '#meta';
import { SpaceOperation } from '#operations';

import { createHistoryTimelineAtom } from './history-timeline';

export type HistoryCompanionProps = Pick<
  AppSurface.ObjectArticleProps<Obj.Unknown, {}, Obj.Unknown>,
  'role' | 'companionTo'
>;

/**
 * History scrubber companion: builds a single timeline from the primary object AND its child
 * objects (so a document's referenced text is included), and drives an in-place time-travel preview
 * of all of them via the core `setTimeTravel`/`clearTimeTravel` API. The opted-in surface reads
 * read-only off the primary's `Entity.timeTravelAtom`. The one write path is "Fork", which persists
 * a new object (and its children) seeded at the selected version.
 */
export const HistoryCompanion = ({ role, companionTo }: HistoryCompanionProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  // The subject identity is stable across scrubbing (time-travel happens in place, never swapping
  // the subject), but capture it on mount anyway so the timeline atom is keyed to a stable object.
  const objectRef = useRef(companionTo);
  const object = objectRef.current;

  // Derive the timeline via an atom that subscribes to the primary and its children through ECHO's
  // `Obj.atom`, so reactivity lives in the atom (not React effects): it recomputes whenever the
  // primary's own fields (e.g. the document name) or any child's content change. The atom is keyed
  // to the stable `object`, so it is created once.
  const timelineAtom = useMemo(() => createHistoryTimelineAtom(object), [object]);
  const { versions, histories, plan } = useAtomValue(timelineAtom);

  // Default to the newest version; tracks the timeline growing as children load until the user scrubs.
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined);
  const index = selectedIndex ?? Math.max(versions.length - 1, 0);

  const latestPointers = useCallback(() => histories.map(({ diffs }) => diffs.length - 1), [histories]);

  // Drive in-place time-travel from the current scrub position. Side-effecting, so it lives in an
  // effect keyed on `index`; `scrubbing` is true for any step other than the latest and keeps the
  // primary (article subject) locked read-only for the whole session, since its referenced children
  // may still be historical even when its own content is current. The cleanup (on index change and
  // on unmount) always restores the live objects.
  useEffect(() => {
    const scrubbing = index < versions.length - 1;
    const pointers = plan[index] ?? latestPointers();
    histories.forEach(({ object: obj, diffs }, objectIndex) => {
      const at = Math.min(pointers[objectIndex] ?? diffs.length - 1, diffs.length - 1);
      if (at >= diffs.length - 1 && !(scrubbing && obj === object)) {
        // At its latest version and not the locked primary → live/editable.
        clearTimeTravel(obj);
      } else {
        // Historical step, or the primary locked read-only for the session (pinned at its latest
        // heads so the plank stays read-only while showing live content).
        setTimeTravel(obj, diffs[at].heads);
      }
    });
    return () => {
      for (const { object: obj } of histories) {
        clearTimeTravel(obj);
      }
    };
  }, [index, versions.length, histories, plan, object, latestPointers]);

  const preview = useCallback((eventIndex: number) => setSelectedIndex(eventIndex), []);

  const handleFork = useCallback(async () => {
    const db = Obj.getDatabase(object);
    if (!db || histories.length === 0) {
      return;
    }

    // The live objects are already pinned to the selected version in place (by the effect above), so
    // reading their fields yields the historical values. Clone each LIVE object so the clone keeps
    // its schema; the clone is seeded from the latest doc, then overwritten with the historical
    // values below.
    const clones = new Map<string, { clone: Obj.Unknown; source: Obj.Unknown }>();
    histories.forEach(({ object: liveObject }) => {
      clones.set(liveObject.id, { clone: Obj.clone(liveObject), source: liveObject });
    });

    // Persist children directly; add the primary via AddObject, which also resolves the canonical
    // navigation path (the same resolution the create flow uses) — don't construct the path here.
    const primaryClone = clones.get(object.id)!.clone;
    for (const [id, { clone }] of clones) {
      if (id !== object.id) {
        db.add(clone);
      }
    }
    const added = await invokePromise(SpaceOperation.AddObject, { object: primaryClone, target: db, hidden: false });

    // Overwrite each clone's fields with the historical values (read from the time-traveling live
    // source), rewiring refs to the cloned children.
    const rewire = (value: unknown): unknown => {
      if (Ref.isRef(value)) {
        const replacement = value.target ? clones.get(value.target.id)?.clone : undefined;
        return replacement ? Ref.make(replacement) : value;
      }
      return value;
    };
    for (const { clone, source } of clones.values()) {
      Obj.update(clone, (clone) => {
        for (const key of Object.getOwnPropertyNames(source)) {
          if (key === 'id') {
            continue;
          }
          const value = (source as any)[key];
          (clone as any)[key] = Array.isArray(value) ? value.map(rewire) : rewire(value);
        }
      });
    }

    const subject = added.data?.subject;
    if (subject) {
      await invokePromise(LayoutOperation.Open, { subject: [...subject], navigation: 'immediate' });
    }
  }, [object, histories, invokePromise]);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.IconButton
            icon='ph--git-branch--regular'
            label={t('history-fork.label')}
            onClick={() => void handleFork()}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <div className='p-2'>
          <HistoryScrubber versions={versions} value={index} onValueChange={preview} />
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
