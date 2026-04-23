# Form

## New features/polish

- [x] Unify readonly/inline modes.
- [x] Refs
  - [x] Single-select (fix popover)
  - [x] Multi-select (array)
- [ ] auto save doesn't work for combobox + select due to only firing on blur (workaround is to use onValuesChanged).
- [ ] Don't call save/autoSave if value hasn't changed.
- [ ] Fix onCancel (restore values).
- [ ] Fix useSchema Type.AnyObj cast.
- [ ] TableCellEditor (handleEnter/ModalController).
- [ ] Use FormFieldWrapper uniformly
- [ ] Inline tables.
- [ ] Defer query until popover.
- [ ] Omit id from sub properties (tune Omit)
