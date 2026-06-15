# App Toolkit

- [ ] Ensure `attendableId` and `companionTo` is propagated from `react-surface` to the container's toolbar.
  - `ObjectSurfaceProps.attendableId` => Toolbar => `MenuRootProps.attendableId`
  - See plugin-assistant/ChatCompanion
  - companionTo should be Obj.Unknown or null (not a string)
