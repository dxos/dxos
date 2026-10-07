//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';

import { Subscription } from '#types';

/**
 * Makes a Post's prose reachable to any plugin that reads text without knowing this type exists —
 * the reading companion, extraction pipelines. The fetched body wins over the feed's own `content`,
 * which is a summary for most publishers and absent for some, and the title leads so a reader that
 * renders the result as markdown gets a heading rather than an unlabelled wall of text.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(AppCapabilities.TextContent, {
      id: Type.getTypename(Subscription.Post),
      getTextContent: async (post: Subscription.Post) => {
        const subscription = await post.source?.load();
        const fetched = subscription ? await Subscription.findPostContent(subscription, post) : undefined;
        const body = fetched?.text ?? post.content ?? post.description;
        return [post.title && `# ${post.title}`, body].filter(Boolean).join('\n\n') || undefined;
      },
    });
  }),
);
