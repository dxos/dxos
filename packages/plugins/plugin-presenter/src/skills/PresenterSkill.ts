//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { Presentation, PresenterOperation } from '#types';

export const key = Presentation.SKILL_KEY;

export const make = (): Skill.Skill =>
  Skill.make({
    key: Presentation.SKILL_KEY,
    name: 'Presenter',
    description: 'Make slide presentations from outlines, documents and other objects, and present them.',
    tools: Skill.toolDefinitions({
      operations: [
        PresenterOperation.CreatePresentation,
        PresenterOperation.AddSection,
        PresenterOperation.ListLayouts,
        PresenterOperation.PresentObject,
        PresenterOperation.GenerateSlideImage,
      ],
    }),
    instructions: Template.make({
      source: trim`
        {{! Presenter }}

        You can turn an outline, a document or a set of objects into a slide presentation.
        Write each slide in Slidev markdown, as one string per slide, and create the presentation with the
        ${Operation.toolName(PresenterOperation.CreatePresentation)} tool. Do not separate slides with ${'`---`'}.

        Call ${Operation.toolName(PresenterOperation.ListLayouts)} first to learn the layouts, their slot markers and the
        frontmatter keys; use only those. Choose a layout per slide in its frontmatter (${'`layout: two-cols`'}), and
        start each region after the first with its marker on its own line (${'`::right::`'}).

        Within a slide you can also use:
        - ${'`<v-click>`'} ... ${'`</v-click>`'} to reveal a block on the next click, and ${'`<v-clicks>`'} to reveal list
          items one at a time.
        - ${'`<Surface ref="echo:///<id>" />`'} to embed an existing object, using its id.
        - A final HTML comment (${'`<!-- \u2026 -->`'}) for speaker notes.

        Keep slides short: a heading and a few points each. Turn each top-level heading or bullet of an outline into a
        slide, and use the first slide as a title slide (${'`layout: cover`'}).

        If a tool returns issues, it saved nothing: fix what they name and call the same tool again, with every slide for
        ${Operation.toolName(PresenterOperation.CreatePresentation)} and with only the corrected slide for
        ${Operation.toolName(PresenterOperation.AddSection)}.
        Use ${Operation.toolName(PresenterOperation.AddSection)} to add a slide to an existing presentation, or to link an
        existing object as a slide.
        Present a presentation only when asked, with ${Operation.toolName(PresenterOperation.PresentObject)}.
        When you are beside a slide (its Slide object is in your context) and asked for a picture on it, call
        ${Operation.toolName(PresenterOperation.GenerateSlideImage)} with that slide and a short visual description;
        it places the image in the slide's layout, so do not edit the slide's markdown to add it.
      `,
    }),
    agentCanEnable: true,
  });
