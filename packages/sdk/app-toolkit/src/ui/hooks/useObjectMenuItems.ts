//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { type MouseEvent, type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Annotation, Obj, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EID } from '@dxos/keys';
import { useTranslation } from '@dxos/react-ui';
import { Attention } from '@dxos/react-ui-attention';
import { type MenuItem, createMenuAction } from '@dxos/react-ui-menu';
import { osTranslations } from '@dxos/ui-theme';

import { GraphPath } from '../../app';
import { LayoutOperation, NavigationOperation } from '../../operations';

const OPEN_ICON = 'ph--arrow-square-out--regular';

type Invoke = ReturnType<typeof useOperationInvoker>['invoke'];

/**
 * The path to open for an object. A card holds an object and has no idea where the nav tree shows it,
 * so ask: {@link NavigationOperation.ResolveNavigationTargets} returns targets best-first, so the
 * canonical home (a collection, a type section) wins over the generic database path. Falls back to the
 * database path when nothing resolves — with no handler registered (a storybook) or no resolver for the
 * type, that path still opens the object, it just isn't where the tree shows it.
 */
const resolveObjectPath = (subject: Obj.Unknown, invoke: Invoke): Effect.Effect<string> => {
  const fallback = GraphPath.getObjectPathFromObject(subject);
  const db = Obj.getDatabase(subject);
  if (!db) {
    return Effect.succeed(fallback);
  }

  return invoke(NavigationOperation.ResolveNavigationTargets, {
    query: { uri: EID.make({ spaceId: db.spaceId, entityId: subject.id }) },
  }).pipe(
    Effect.map(({ targets }) => targets[0]?.path ?? fallback),
    Effect.orElseSucceed(() => fallback),
  );
};

/** Resolve the object's canonical path, then open it beside the plank the card lives in. */
const openObject = (
  subject: Obj.Unknown,
  invoke: Invoke,
  options: { pivotId?: string; modifiers?: { shift?: boolean } },
): Effect.Effect<void> =>
  Effect.gen(function* () {
    const path = yield* resolveObjectPath(subject, invoke);
    yield* invoke(LayoutOperation.Open, { subject: [path], disposition: 'add', ...options });
  }).pipe(Effect.ignore);

/**
 * Helper for card content that opens objects (e.g. a related-object link): attach `ref` to the card's
 * root element, then pass the returned id as the Open `pivotId` with `disposition: 'add'`, so navigation
 * always adds a plank beside the card's own plank rather than replacing the deck. The card's outermost
 * attendable ancestor *is* its plank, so the pivot is resolved structurally once mounted (see
 * {@link Attention.getRootAttendableId}) and is `undefined` until then, which no menu action can observe.
 */
export const useCardPivot = (): readonly [RefObject<HTMLDivElement | null>, string | undefined] => {
  const ref = useRef<HTMLDivElement>(null);
  const [pivotId, setPivotId] = useState<string | undefined>();
  useEffect(() => {
    setPivotId(ref.current ? Attention.getRootAttendableId(ref.current) : undefined);
  }, []);
  return [ref, pivotId];
};

/** True when subject is an Echo object and its schema does not have the hidden annotation. */
const canNavigateToSubject = (subject: unknown): subject is Obj.Unknown => {
  if (!subject || !Obj.isObject(subject)) {
    return false;
  }

  if (!Obj.getDatabase(subject) || !Obj.getTypename(subject)) {
    return false;
  }

  const type = Obj.getType(subject);
  return !(type != null && Option.getOrElse(Annotation.HiddenAnnotation.get(Type.getSchema(type)), () => false));
};

/**
 * Returns an onClick handler that opens the subject in the layout, or undefined if the subject is not navigable
 * (e.g. not an Echo object or has hidden annotation). Use with Card.Title for object cards.
 * A card lives inside a plank, so opening its object always adds a plank beside that plank (`add`), never
 * replacing it. The origin plank is resolved structurally from the click target via {@link Attention.getRootAttendableId},
 * and the destination path via {@link resolveObjectPath}.
 */
export const useObjectNavigate = (subject: unknown): ((event: MouseEvent<HTMLElement>) => void) | undefined => {
  const { invoke } = useOperationInvoker();

  return useMemo(() => {
    if (!canNavigateToSubject(subject)) {
      return;
    }

    return (event: MouseEvent<HTMLElement>) => {
      // `currentTarget` is only valid while the event is dispatching, so read the pivot before the
      // resolution the program awaits.
      const pivotId = Attention.getRootAttendableId(event.currentTarget);
      void EffectEx.runPromise(openObject(subject, invoke, { pivotId }));
    };
  }, [subject, invoke]);
};

/**
 * Returns object-scoped menu items (e.g. Open/Navigate) for the given subject.
 * Only includes items when subject is an Echo object and its schema does not have the system annotation.
 * Use with useMenu(CONTRIBUTOR_NAME).addMenuItems from a component inside Card.Root to register with the card menu.
 * A card lives inside a plank, so opening its object always adds a plank beside that plank (`add`), never
 * replacing it. The menu renders in a portal, so it cannot resolve the plank from its own DOM: the caller
 * supplies the plank's attendable id as `pivot` — via {@link useCardPivot} when the card knows only its
 * own element.
 */
export const useObjectMenuItems = (subject: unknown, pivot?: string): MenuItem[] => {
  const { invoke } = useOperationInvoker();
  const { t } = useTranslation(osTranslations);

  return useMemo(() => {
    if (!canNavigateToSubject(subject)) {
      return [];
    }

    return [
      createMenuAction(
        'navigate',
        (params) =>
          void EffectEx.runPromise(openObject(subject, invoke, { pivotId: pivot, modifiers: params?.modifiers })),
        {
          label: t('open.label'),
          icon: OPEN_ICON,
        },
      ),
    ];
  }, [subject, invoke, t, pivot]);
};

/** ID for object-actions (Open/Navigate). Use with useMenu(CONTRIBUTOR_NAME).addMenuItems. */
export const OBJECT_ACTIONS_CONTRIBUTION_ID = 'object-actions';

/**
 * Priority for object-actions contribution.
 */
export const OBJECT_ACTIONS_CONTRIBUTION_PRIORITY = 50;
