//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import { type MouseEvent, type RefObject, useCallback, useMemo, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Annotation, Obj, Type } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { getAttendables } from '@dxos/react-ui-attention';
import { type MenuItem, createMenuAction } from '@dxos/react-ui-menu';
import { osTranslations } from '@dxos/ui-theme';

import { Paths } from '../../app';
import { LayoutOperation } from '../../operations';

const OPEN_ICON = 'ph--arrow-square-out--regular';

/**
 * The outermost attendable ancestor of `element` — the plank it is rendered within (the root of the
 * nested stack/section attendables). Card navigation uses it as the Open pivot so an object opens beside
 * the card's own plank; it is structural (real DOM ancestry), so it is correct regardless of what is
 * attended. Resolve it from a click target (in-DOM), not from within a portaled menu.
 */
export const getRootAttendableId = (element: Element): string | undefined =>
  getAttendables('[data-attendable-id]', element).at(-1);

/**
 * Helper for card content that opens objects (e.g. a related-object link): attach `ref` to the card's
 * root element, then pass `getPivotId()` as the Open `pivotId` with `disposition: 'add'`, so navigation
 * always adds a plank beside the card's own plank rather than replacing the deck. Resolves the plank
 * structurally from the DOM (see {@link getRootAttendableId}), computed lazily at click time.
 */
export const useCardPivot = (): readonly [RefObject<HTMLDivElement | null>, () => string | undefined] => {
  const ref = useRef<HTMLDivElement>(null);
  const getPivotId = useCallback(() => (ref.current ? getRootAttendableId(ref.current) : undefined), []);
  return [ref, getPivotId];
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
 * replacing it. The origin plank is resolved structurally from the click target via {@link getRootAttendableId}.
 */
export const useObjectNavigate = (subject: unknown): ((event: MouseEvent<HTMLElement>) => void) | undefined => {
  const { invokePromise } = useOperationInvoker();

  return useMemo(() => {
    if (!canNavigateToSubject(subject)) {
      return;
    }

    const subjectPath = Paths.getObjectPathFromObject(subject);
    return (event: MouseEvent<HTMLElement>) => {
      void invokePromise(LayoutOperation.Open, {
        subject: [subjectPath],
        pivotId: getRootAttendableId(event.currentTarget),
        disposition: 'add',
      });
    };
  }, [subject, invokePromise]);
};

/**
 * Returns object-scoped menu items (e.g. Open/Navigate) for the given subject.
 * Only includes items when subject is an Echo object and its schema does not have the system annotation.
 * Use with useMenu(CONTRIBUTOR_NAME).addMenuItems from a component inside Card.Root to register with the card menu.
 * A card lives inside a plank, so opening its object always adds a plank beside that plank (`add`), never
 * replacing it. The menu renders in a portal, so it cannot resolve the plank from its own DOM: the caller
 * supplies `pivot` — either the plank's attendable id directly, or a ref to an element inside the card, from
 * which the plank is resolved structurally at click time (see {@link getRootAttendableId}).
 */
export const useObjectMenuItems = (subject: unknown, pivot?: string | RefObject<Element | null>): MenuItem[] => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(osTranslations);

  return useMemo(() => {
    if (!canNavigateToSubject(subject)) {
      return [];
    }

    const subjectPath = Paths.getObjectPathFromObject(subject);
    return [
      createMenuAction(
        'navigate',
        (params) => {
          const pivotId =
            typeof pivot === 'string' ? pivot : pivot?.current ? getRootAttendableId(pivot.current) : undefined;
          void invokePromise(LayoutOperation.Open, {
            subject: [subjectPath],
            pivotId,
            disposition: 'add',
            modifiers: params?.modifiers,
          });
        },
        {
          label: t('open.label'),
          icon: OPEN_ICON,
        },
      ),
    ];
  }, [subject, invokePromise, t, pivot]);
};

/** ID for object-actions (Open/Navigate). Use with useMenu(CONTRIBUTOR_NAME).addMenuItems. */
export const OBJECT_ACTIONS_CONTRIBUTION_ID = 'object-actions';

/**
 * Priority for object-actions contribution.
 */
export const OBJECT_ACTIONS_CONTRIBUTION_PRIORITY = 50;
