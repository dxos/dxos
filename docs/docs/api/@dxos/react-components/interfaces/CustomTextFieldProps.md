# Interface `CustomTextFieldProps`
> Declared in [`packages/sdk/react-components/src/CustomTextField.tsx`]()


## Properties
### `FormHelperTextProps: Partial<FormHelperTextProps<"p", object>>`
Props applied to the [ `FormHelperText` ](/material-ui/api/form-helper-text/) element.
### `InputLabelProps: Partial<InputLabelProps>`
Props applied to the [ `InputLabel` ](/material-ui/api/input-label/) element.
Pointer events like  `onClick`  are enabled if and only if  `shrink`  is  `true` .
### `SelectProps: Partial<SelectProps<unknown>>`
Props applied to the [ `Select` ](/material-ui/api/select/) element.
### `about: string`
### `accessKey: string`
### `aria-activedescendant: string`
Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application.
### `aria-atomic: Booleanish`
Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute.
### `aria-autocomplete: "list" | "none" | "inline" | "both"`
Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
presented if they are made.
### `aria-busy: Booleanish`
Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user.
### `aria-checked: boolean | "true" | "false" | "mixed"`
Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
### `aria-colcount: number`
Defines the total number of columns in a table, grid, or treegrid.
### `aria-colindex: number`
Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
### `aria-colspan: number`
Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
### `aria-controls: string`
Identifies the element (or elements) whose contents or presence are controlled by the current element.
### `aria-current: boolean | "time" | "true" | "false" | "date" | "page" | "step" | "location"`
Indicates the element that represents the current item within a container or set of related elements.
### `aria-describedby: string`
Identifies the element (or elements) that describes the object.
### `aria-details: string`
Identifies the element that provides a detailed, extended description for the object.
### `aria-disabled: Booleanish`
Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
### `aria-dropeffect: "link" | "none" | "copy" | "execute" | "move" | "popup"`
Indicates what functions can be performed when a dragged object is released on the drop target.
### `aria-errormessage: string`
Identifies the element that provides an error message for the object.
### `aria-expanded: Booleanish`
Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed.
### `aria-flowto: string`
Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
allows assistive technology to override the general default of reading in document source order.
### `aria-grabbed: Booleanish`
Indicates an element's "grabbed" state in a drag-and-drop operation.
### `aria-haspopup: boolean | "grid" | "dialog" | "menu" | "true" | "false" | "listbox" | "tree"`
Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element.
### `aria-hidden: Booleanish`
Indicates whether the element is exposed to an accessibility API.
### `aria-invalid: boolean | "true" | "false" | "grammar" | "spelling"`
Indicates the entered value does not conform to the format expected by the application.
### `aria-keyshortcuts: string`
Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element.
### `aria-label: string`
Defines a string value that labels the current element.
### `aria-labelledby: string`
Identifies the element (or elements) that labels the current element.
### `aria-level: number`
Defines the hierarchical level of an element within a structure.
### `aria-live: "off" | "assertive" | "polite"`
Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region.
### `aria-modal: Booleanish`
Indicates whether an element is modal when displayed.
### `aria-multiline: Booleanish`
Indicates whether a text box accepts multiple lines of input or only a single line.
### `aria-multiselectable: Booleanish`
Indicates that the user may select more than one item from the current selectable descendants.
### `aria-orientation: "horizontal" | "vertical"`
Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous.
### `aria-owns: string`
Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
### `aria-placeholder: string`
Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
A hint could be a sample value or a brief description of the expected format.
### `aria-posinset: number`
Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
### `aria-pressed: boolean | "true" | "false" | "mixed"`
Indicates the current "pressed" state of toggle buttons.
### `aria-readonly: Booleanish`
Indicates that the element is not editable, but is otherwise operable.
### `aria-relevant: "all" | "text" | "additions" | "additions removals" | "additions text" | "removals" | "removals additions" | "removals text" | "text additions" | "text removals"`
Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
### `aria-required: Booleanish`
Indicates that user input is required on the element before a form may be submitted.
### `aria-roledescription: string`
Defines a human-readable, author-localized description for the role of an element.
### `aria-rowcount: number`
Defines the total number of rows in a table, grid, or treegrid.
### `aria-rowindex: number`
Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
### `aria-rowspan: number`
Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
### `aria-selected: Booleanish`
Indicates the current "selected" state of various widgets.
### `aria-setsize: number`
Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
### `aria-sort: "none" | "ascending" | "descending" | "other"`
Indicates if items in a table or grid are sorted in ascending or descending order.
### `aria-valuemax: number`
Defines the maximum allowed value for a range widget.
### `aria-valuemin: number`
Defines the minimum allowed value for a range widget.
### `aria-valuenow: number`
Defines the current value for a range widget.
### `aria-valuetext: string`
Defines the human readable text alternative of aria-valuenow for a range widget.
### `autoCapitalize: string`
### `autoComplete: string`
### `autoCorrect: string`
### `autoFocus: boolean`
If  `true` , the  `input`  element is focused during the first mount.
### `autoSave: string`
### `className: string`
### `classes: Partial<TextFieldClasses>`
Override or extend the styles applied to the component.
### `clickToEdit: boolean`
### `color: "error" | "primary" | "secondary" | "info" | "success" | "warning"`
The color of the component.
It supports both default and custom theme colors, which can be added as shown in the
[palette customization guide](https://mui.com/material-ui/customization/palette/#adding-new-colors).
### `contentEditable: Booleanish | "inherit"`
### `contextMenu: string`
### `dangerouslySetInnerHTML: object`
### `datatype: string`
### `defaultChecked: boolean`
### `defaultValue: unknown`
The default value. Use when the component is not controlled.
### `dir: string`
### `disabled: boolean`
If  `true` , the component is disabled.
### `draggable: Booleanish`
### `editIcon: FunctionComponent<object>`
### `editing: boolean`
### `error: boolean`
If  `true` , the label is displayed in an error state.
### `focused: boolean`
If  `true` , the component is displayed in focused state.
### `fullWidth: boolean`
If  `true` , the input will take up the full width of its container.
### `helperText: ReactNode`
The helper text content.
### `hidden: boolean`
### `hiddenLabel: boolean`
If  `true` , the label is hidden.
This is used to increase density for a  `FilledInput` .
Be sure to add  `aria-label`  to the  `input`  element.
### `id: string`
The id of the  `input`  element.
Use this prop to make  `label`  and  `helperText`  accessible for screen readers.
### `inlist: any`
### `inputMode: "text" | "none" | "search" | "tel" | "url" | "email" | "numeric" | "decimal"`
Hints at the type of data that might be entered by the user while editing the element or its contents
### `inputProps: InputBaseComponentProps`
[Attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#Attributes) applied to the  `input`  element.
### `inputRef: Ref<any>`
Pass a ref to the  `input`  element.
### `is: string`
Specify that a standard HTML element should behave like a defined custom built-in element
### `itemID: string`
### `itemProp: string`
### `itemRef: string`
### `itemScope: boolean`
### `itemType: string`
### `key: "null" | Key`
### `label: ReactNode`
The label content.
### `lang: string`
### `margin: "none" | "dense" | "normal"`
If  `dense`  or  `normal` , will adjust vertical spacing of this and contained components.
### `maxRows: string | number`
Maximum number of rows to display when multiline option is set to true.
### `minRows: string | number`
Minimum number of rows to display when multiline option is set to true.
### `multiline: boolean`
If  `true` , a  `textarea`  element is rendered instead of an input.
### `name: string`
Name attribute of the  `input`  element.
### `onAbort: ReactEventHandler<HTMLDivElement>`
### `onAbortCapture: ReactEventHandler<HTMLDivElement>`
### `onAnimationEnd: AnimationEventHandler<HTMLDivElement>`
### `onAnimationEndCapture: AnimationEventHandler<HTMLDivElement>`
### `onAnimationIteration: AnimationEventHandler<HTMLDivElement>`
### `onAnimationIterationCapture: AnimationEventHandler<HTMLDivElement>`
### `onAnimationStart: AnimationEventHandler<HTMLDivElement>`
### `onAnimationStartCapture: AnimationEventHandler<HTMLDivElement>`
### `onAuxClick: MouseEventHandler<HTMLDivElement>`
### `onAuxClickCapture: MouseEventHandler<HTMLDivElement>`
### `onBeforeInput: FormEventHandler<HTMLDivElement>`
### `onBeforeInputCapture: FormEventHandler<HTMLDivElement>`
### `onBlur: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>`
### `onBlurCapture: FocusEventHandler<HTMLDivElement>`
### `onCanPlay: ReactEventHandler<HTMLDivElement>`
### `onCanPlayCapture: ReactEventHandler<HTMLDivElement>`
### `onCanPlayThrough: ReactEventHandler<HTMLDivElement>`
### `onCanPlayThroughCapture: ReactEventHandler<HTMLDivElement>`
### `onChangeCapture: FormEventHandler<HTMLDivElement>`
### `onClick: MouseEventHandler<HTMLDivElement>`
### `onClickCapture: MouseEventHandler<HTMLDivElement>`
### `onCompositionEnd: CompositionEventHandler<HTMLDivElement>`
### `onCompositionEndCapture: CompositionEventHandler<HTMLDivElement>`
### `onCompositionStart: CompositionEventHandler<HTMLDivElement>`
### `onCompositionStartCapture: CompositionEventHandler<HTMLDivElement>`
### `onCompositionUpdate: CompositionEventHandler<HTMLDivElement>`
### `onCompositionUpdateCapture: CompositionEventHandler<HTMLDivElement>`
### `onContextMenu: MouseEventHandler<HTMLDivElement>`
### `onContextMenuCapture: MouseEventHandler<HTMLDivElement>`
### `onCopy: ClipboardEventHandler<HTMLDivElement>`
### `onCopyCapture: ClipboardEventHandler<HTMLDivElement>`
### `onCut: ClipboardEventHandler<HTMLDivElement>`
### `onCutCapture: ClipboardEventHandler<HTMLDivElement>`
### `onDoubleClick: MouseEventHandler<HTMLDivElement>`
### `onDoubleClickCapture: MouseEventHandler<HTMLDivElement>`
### `onDrag: DragEventHandler<HTMLDivElement>`
### `onDragCapture: DragEventHandler<HTMLDivElement>`
### `onDragEnd: DragEventHandler<HTMLDivElement>`
### `onDragEndCapture: DragEventHandler<HTMLDivElement>`
### `onDragEnter: DragEventHandler<HTMLDivElement>`
### `onDragEnterCapture: DragEventHandler<HTMLDivElement>`
### `onDragExit: DragEventHandler<HTMLDivElement>`
### `onDragExitCapture: DragEventHandler<HTMLDivElement>`
### `onDragLeave: DragEventHandler<HTMLDivElement>`
### `onDragLeaveCapture: DragEventHandler<HTMLDivElement>`
### `onDragOver: DragEventHandler<HTMLDivElement>`
### `onDragOverCapture: DragEventHandler<HTMLDivElement>`
### `onDragStart: DragEventHandler<HTMLDivElement>`
### `onDragStartCapture: DragEventHandler<HTMLDivElement>`
### `onDrop: DragEventHandler<HTMLDivElement>`
### `onDropCapture: DragEventHandler<HTMLDivElement>`
### `onDurationChange: ReactEventHandler<HTMLDivElement>`
### `onDurationChangeCapture: ReactEventHandler<HTMLDivElement>`
### `onEmptied: ReactEventHandler<HTMLDivElement>`
### `onEmptiedCapture: ReactEventHandler<HTMLDivElement>`
### `onEncrypted: ReactEventHandler<HTMLDivElement>`
### `onEncryptedCapture: ReactEventHandler<HTMLDivElement>`
### `onEnded: ReactEventHandler<HTMLDivElement>`
### `onEndedCapture: ReactEventHandler<HTMLDivElement>`
### `onError: ReactEventHandler<HTMLDivElement>`
### `onErrorCapture: ReactEventHandler<HTMLDivElement>`
### `onFocus: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>`
### `onFocusCapture: FocusEventHandler<HTMLDivElement>`
### `onGotPointerCapture: PointerEventHandler<HTMLDivElement>`
### `onGotPointerCaptureCapture: PointerEventHandler<HTMLDivElement>`
### `onInput: FormEventHandler<HTMLDivElement>`
### `onInputCapture: FormEventHandler<HTMLDivElement>`
### `onInvalid: FormEventHandler<HTMLDivElement>`
### `onInvalidCapture: FormEventHandler<HTMLDivElement>`
### `onKeyDown: KeyboardEventHandler<HTMLDivElement>`
### `onKeyDownCapture: KeyboardEventHandler<HTMLDivElement>`
### `onKeyPress: KeyboardEventHandler<HTMLDivElement>`
### `onKeyPressCapture: KeyboardEventHandler<HTMLDivElement>`
### `onKeyUp: KeyboardEventHandler<HTMLDivElement>`
### `onKeyUpCapture: KeyboardEventHandler<HTMLDivElement>`
### `onLoad: ReactEventHandler<HTMLDivElement>`
### `onLoadCapture: ReactEventHandler<HTMLDivElement>`
### `onLoadStart: ReactEventHandler<HTMLDivElement>`
### `onLoadStartCapture: ReactEventHandler<HTMLDivElement>`
### `onLoadedData: ReactEventHandler<HTMLDivElement>`
### `onLoadedDataCapture: ReactEventHandler<HTMLDivElement>`
### `onLoadedMetadata: ReactEventHandler<HTMLDivElement>`
### `onLoadedMetadataCapture: ReactEventHandler<HTMLDivElement>`
### `onLostPointerCapture: PointerEventHandler<HTMLDivElement>`
### `onLostPointerCaptureCapture: PointerEventHandler<HTMLDivElement>`
### `onMouseDown: MouseEventHandler<HTMLDivElement>`
### `onMouseDownCapture: MouseEventHandler<HTMLDivElement>`
### `onMouseEnter: MouseEventHandler<HTMLDivElement>`
### `onMouseLeave: MouseEventHandler<HTMLDivElement>`
### `onMouseMove: MouseEventHandler<HTMLDivElement>`
### `onMouseMoveCapture: MouseEventHandler<HTMLDivElement>`
### `onMouseOut: MouseEventHandler<HTMLDivElement>`
### `onMouseOutCapture: MouseEventHandler<HTMLDivElement>`
### `onMouseOver: MouseEventHandler<HTMLDivElement>`
### `onMouseOverCapture: MouseEventHandler<HTMLDivElement>`
### `onMouseUp: MouseEventHandler<HTMLDivElement>`
### `onMouseUpCapture: MouseEventHandler<HTMLDivElement>`
### `onPaste: ClipboardEventHandler<HTMLDivElement>`
### `onPasteCapture: ClipboardEventHandler<HTMLDivElement>`
### `onPause: ReactEventHandler<HTMLDivElement>`
### `onPauseCapture: ReactEventHandler<HTMLDivElement>`
### `onPlay: ReactEventHandler<HTMLDivElement>`
### `onPlayCapture: ReactEventHandler<HTMLDivElement>`
### `onPlaying: ReactEventHandler<HTMLDivElement>`
### `onPlayingCapture: ReactEventHandler<HTMLDivElement>`
### `onPointerCancel: PointerEventHandler<HTMLDivElement>`
### `onPointerCancelCapture: PointerEventHandler<HTMLDivElement>`
### `onPointerDown: PointerEventHandler<HTMLDivElement>`
### `onPointerDownCapture: PointerEventHandler<HTMLDivElement>`
### `onPointerEnter: PointerEventHandler<HTMLDivElement>`
### `onPointerEnterCapture: PointerEventHandler<HTMLDivElement>`
### `onPointerLeave: PointerEventHandler<HTMLDivElement>`
### `onPointerLeaveCapture: PointerEventHandler<HTMLDivElement>`
### `onPointerMove: PointerEventHandler<HTMLDivElement>`
### `onPointerMoveCapture: PointerEventHandler<HTMLDivElement>`
### `onPointerOut: PointerEventHandler<HTMLDivElement>`
### `onPointerOutCapture: PointerEventHandler<HTMLDivElement>`
### `onPointerOver: PointerEventHandler<HTMLDivElement>`
### `onPointerOverCapture: PointerEventHandler<HTMLDivElement>`
### `onPointerUp: PointerEventHandler<HTMLDivElement>`
### `onPointerUpCapture: PointerEventHandler<HTMLDivElement>`
### `onProgress: ReactEventHandler<HTMLDivElement>`
### `onProgressCapture: ReactEventHandler<HTMLDivElement>`
### `onRateChange: ReactEventHandler<HTMLDivElement>`
### `onRateChangeCapture: ReactEventHandler<HTMLDivElement>`
### `onReset: FormEventHandler<HTMLDivElement>`
### `onResetCapture: FormEventHandler<HTMLDivElement>`
### `onScroll: UIEventHandler<HTMLDivElement>`
### `onScrollCapture: UIEventHandler<HTMLDivElement>`
### `onSeeked: ReactEventHandler<HTMLDivElement>`
### `onSeekedCapture: ReactEventHandler<HTMLDivElement>`
### `onSeeking: ReactEventHandler<HTMLDivElement>`
### `onSeekingCapture: ReactEventHandler<HTMLDivElement>`
### `onSelect: ReactEventHandler<HTMLDivElement>`
### `onSelectCapture: ReactEventHandler<HTMLDivElement>`
### `onStalled: ReactEventHandler<HTMLDivElement>`
### `onStalledCapture: ReactEventHandler<HTMLDivElement>`
### `onSubmit: FormEventHandler<HTMLDivElement>`
### `onSubmitCapture: FormEventHandler<HTMLDivElement>`
### `onSuspend: ReactEventHandler<HTMLDivElement>`
### `onSuspendCapture: ReactEventHandler<HTMLDivElement>`
### `onTimeUpdate: ReactEventHandler<HTMLDivElement>`
### `onTimeUpdateCapture: ReactEventHandler<HTMLDivElement>`
### `onTouchCancel: TouchEventHandler<HTMLDivElement>`
### `onTouchCancelCapture: TouchEventHandler<HTMLDivElement>`
### `onTouchEnd: TouchEventHandler<HTMLDivElement>`
### `onTouchEndCapture: TouchEventHandler<HTMLDivElement>`
### `onTouchMove: TouchEventHandler<HTMLDivElement>`
### `onTouchMoveCapture: TouchEventHandler<HTMLDivElement>`
### `onTouchStart: TouchEventHandler<HTMLDivElement>`
### `onTouchStartCapture: TouchEventHandler<HTMLDivElement>`
### `onTransitionEnd: TransitionEventHandler<HTMLDivElement>`
### `onTransitionEndCapture: TransitionEventHandler<HTMLDivElement>`
### `onUpdate: function`
### `onVolumeChange: ReactEventHandler<HTMLDivElement>`
### `onVolumeChangeCapture: ReactEventHandler<HTMLDivElement>`
### `onWaiting: ReactEventHandler<HTMLDivElement>`
### `onWaitingCapture: ReactEventHandler<HTMLDivElement>`
### `onWheel: WheelEventHandler<HTMLDivElement>`
### `onWheelCapture: WheelEventHandler<HTMLDivElement>`
### `placeholder: string`
### `prefix: string`
### `property: string`
### `radioGroup: string`
### `readonly: boolean`
### `ref: "null" | function | RefObject<HTMLDivElement>`
### `required: boolean`
If  `true` , the label is displayed as required and the  `input`  element is required.
### `resource: string`
### `results: number`
### `role: AriaRole`
### `rows: string | number`
Number of rows to display when multiline option is set to true.
### `saveOnBlur: boolean`
### `security: string`
### `select: boolean`
Render a [ `Select` ](/material-ui/api/select/) element while passing the Input element to  `Select`  as  `input`  parameter.
If this option is set you must pass the options of the select as children.
### `size: "small" | "medium"`
The size of the component.
### `slot: string`
### `spellCheck: boolean`
### `style: CSSProperties`
### `suppressContentEditableWarning: boolean`
### `suppressHydrationWarning: boolean`
### `sx: SxProps<Theme>`
The system prop that allows defining system overrides as well as additional CSS styles.
### `tabIndex: number`
### `title: string`
### `translate: "yes" | "no"`
### `type: HTMLInputTypeAttribute`
Type of the  `input`  element. It should be [a valid HTML5 input type](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#Form_%3Cinput%3E_types).
### `typeof: string`
### `unselectable: "on" | "off"`
### `value: string`
### `variant: "standard" | "outlined" | "filled"`
The variant to use.
### `vocab: string`