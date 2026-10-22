//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { Presentation } from '#types';

/** One slide of a deck: an owned Text, a linked object, or a ref not yet resolved. */
export type SlideSource =
  | { kind: 'text'; id: string; text: Text.Text }
  | { kind: 'object'; id: string; object: Obj.Unknown }
  | { kind: 'pending'; id: string };

/**
 * Maps sections to slide sources; `targets[index]` is the resolved target of `sections[index]`
 * so the result always has one entry per section.
 */
export const toSlideSources = (
  presentation: Presentation.Presentation,
  targets: ReadonlyArray<Obj.Unknown | undefined>,
): SlideSource[] =>
  presentation.sections.map((ref, index): SlideSource => {
    const target = targets[index];
    const uri = EID.tryParse(ref.uri);
    const id = (uri && EID.getEntityId(uri)) || ref.uri;
    if (!target) {
      return { kind: 'pending', id };
    }
    if (Obj.instanceOf(Text.Text, target) && Presentation.isOwned(presentation, target)) {
      return { kind: 'text', id, text: target };
    }
    return { kind: 'object', id, object: target };
  });
