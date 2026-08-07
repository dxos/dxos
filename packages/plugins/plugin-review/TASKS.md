# plugin-review tasks

## Storybook

- [ ] **Consider using story-modules to manage surfaces.** `ReviewStoryLayout` (`src/testing/`) hard-codes
      which companion surfaces a story shows (`panels: ['comments', 'history']`) and renders them through
      `Surface` with `companionTo` data. A story-module abstraction could declare the surfaces a story
      contributes/consumes instead, so stories compose the same way the app does rather than through a
      bespoke layout prop.

## Review UI

- [ ] **Switching to Suggesting adds a new gutter.** Selecting the Suggesting view mode introduces an
      extra gutter column beside the editor rather than reusing the existing change-bar gutter, so the
      text shifts when the mode changes.
