//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Flex, ScrollArea } from '@dxos/react-ui';
import { isNonNullable } from '@dxos/util';

import { ObjectCard } from '#components';

export type CardStackProps = Pick<AppSurface.CardStackData, 'objects'>;

/**
 * Several objects, one under another, each as a card.
 *
 * The host hands the stack what belongs in it — a task's artifacts, a record's attachments — so
 * this renders a list it is given rather than deriving one from a subject the way `RelatedArticle`
 * does. Each card is the generic {@link ObjectCard}: label and depiction from the schema's
 * annotations, body from the type's own `CardContent` surface.
 *
 * Bare, with no panel or toolbar of its own: a stack is something a host puts beside or beneath its
 * own content, and a `Panel.Root` here would claim a second toolbar row in a plank that already has
 * one. It scrolls itself, so a host can bound it without the cards deciding its height.
 */
export const CardStack = ({ objects: refs }: CardStackProps) => {
  // Resolved reactively rather than through `ref.target`: on a cold load the targets are not in
  // memory yet, and a synchronous read would leave the stack permanently empty. `ref.atom` tracks
  // loading without tracking mutations — a rename re-renders only its card, which subscribes itself.
  const objectsAtom = useMemo(() => Atom.make((get) => refs.map((ref) => get(ref.atom)).filter(isNonNullable)), [refs]);
  const objects = useAtomValue(objectsAtom);

  // Nothing to show is nothing at all, not an empty region: the host decides whether its absence
  // needs saying, and a stack with no cards would otherwise hold open a gap under the content.
  if (objects.length === 0) {
    return null;
  }

  return (
    <ScrollArea.Root padding centered data-testid='cardStack'>
      <ScrollArea.Viewport>
        <Flex column gap='sm' classNames='py-trim-md'>
          {objects.map((object) => (
            <ObjectCard key={Obj.getURI(object).toString()} data={object} fullWidth />
          ))}
        </Flex>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

CardStack.displayName = 'CardStack';
