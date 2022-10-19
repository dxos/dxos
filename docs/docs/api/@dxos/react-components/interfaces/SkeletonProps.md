# Interface `SkeletonProps`
> Declared in [`packages/sdk/react-components/src/Skeleton/Skeleton.tsx`]()


## Properties
### `about: string`
### `accessKey: string`
### `animation: "false" | "pulse" | "wave"`
The animation.
If  `false`  the animation effect is disabled.
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
### `autoCorrect: string`
### `autoSave: string`
### `children: ReactNode`
Optional children to infer width and height from.
### `className: string`
### `classes: Partial<SkeletonClasses> & Partial<ClassNameMap<never>>`
Override or extend the styles applied to the component.
### `color: string`
### `contentEditable: Booleanish | "inherit"`
### `contextMenu: string`
### `dangerouslySetInnerHTML: object`
### `datatype: string`
### `defaultChecked: boolean`
### `defaultValue: string | number | readonly string[]`
### `delay: number`
### `dir: string`
### `draggable: Booleanish`
### `height: string | number`
Height of the skeleton.
Useful when you don't want to adapt the skeleton to a text element but for instance a card.
### `hidden: boolean`
### `id: string`
### `inlist: any`
### `inputMode: "text" | "none" | "search" | "tel" | "url" | "email" | "numeric" | "decimal"`
Hints at the type of data that might be entered by the user while editing the element or its contents
### `is: string`
Specify that a standard HTML element should behave like a defined custom built-in element
### `itemID: string`
### `itemProp: string`
### `itemRef: string`
### `itemScope: boolean`
### `itemType: string`
### `key: "null" | Key`
### `lang: string`
### `onAbort: ReactEventHandler<HTMLSpanElement>`
### `onAbortCapture: ReactEventHandler<HTMLSpanElement>`
### `onAnimationEnd: AnimationEventHandler<HTMLSpanElement>`
### `onAnimationEndCapture: AnimationEventHandler<HTMLSpanElement>`
### `onAnimationIteration: AnimationEventHandler<HTMLSpanElement>`
### `onAnimationIterationCapture: AnimationEventHandler<HTMLSpanElement>`
### `onAnimationStart: AnimationEventHandler<HTMLSpanElement>`
### `onAnimationStartCapture: AnimationEventHandler<HTMLSpanElement>`
### `onAuxClick: MouseEventHandler<HTMLSpanElement>`
### `onAuxClickCapture: MouseEventHandler<HTMLSpanElement>`
### `onBeforeInput: FormEventHandler<HTMLSpanElement>`
### `onBeforeInputCapture: FormEventHandler<HTMLSpanElement>`
### `onBlur: FocusEventHandler<HTMLSpanElement>`
### `onBlurCapture: FocusEventHandler<HTMLSpanElement>`
### `onCanPlay: ReactEventHandler<HTMLSpanElement>`
### `onCanPlayCapture: ReactEventHandler<HTMLSpanElement>`
### `onCanPlayThrough: ReactEventHandler<HTMLSpanElement>`
### `onCanPlayThroughCapture: ReactEventHandler<HTMLSpanElement>`
### `onChange: FormEventHandler<HTMLSpanElement>`
### `onChangeCapture: FormEventHandler<HTMLSpanElement>`
### `onClick: MouseEventHandler<HTMLSpanElement>`
### `onClickCapture: MouseEventHandler<HTMLSpanElement>`
### `onCompositionEnd: CompositionEventHandler<HTMLSpanElement>`
### `onCompositionEndCapture: CompositionEventHandler<HTMLSpanElement>`
### `onCompositionStart: CompositionEventHandler<HTMLSpanElement>`
### `onCompositionStartCapture: CompositionEventHandler<HTMLSpanElement>`
### `onCompositionUpdate: CompositionEventHandler<HTMLSpanElement>`
### `onCompositionUpdateCapture: CompositionEventHandler<HTMLSpanElement>`
### `onContextMenu: MouseEventHandler<HTMLSpanElement>`
### `onContextMenuCapture: MouseEventHandler<HTMLSpanElement>`
### `onCopy: ClipboardEventHandler<HTMLSpanElement>`
### `onCopyCapture: ClipboardEventHandler<HTMLSpanElement>`
### `onCut: ClipboardEventHandler<HTMLSpanElement>`
### `onCutCapture: ClipboardEventHandler<HTMLSpanElement>`
### `onDoubleClick: MouseEventHandler<HTMLSpanElement>`
### `onDoubleClickCapture: MouseEventHandler<HTMLSpanElement>`
### `onDrag: DragEventHandler<HTMLSpanElement>`
### `onDragCapture: DragEventHandler<HTMLSpanElement>`
### `onDragEnd: DragEventHandler<HTMLSpanElement>`
### `onDragEndCapture: DragEventHandler<HTMLSpanElement>`
### `onDragEnter: DragEventHandler<HTMLSpanElement>`
### `onDragEnterCapture: DragEventHandler<HTMLSpanElement>`
### `onDragExit: DragEventHandler<HTMLSpanElement>`
### `onDragExitCapture: DragEventHandler<HTMLSpanElement>`
### `onDragLeave: DragEventHandler<HTMLSpanElement>`
### `onDragLeaveCapture: DragEventHandler<HTMLSpanElement>`
### `onDragOver: DragEventHandler<HTMLSpanElement>`
### `onDragOverCapture: DragEventHandler<HTMLSpanElement>`
### `onDragStart: DragEventHandler<HTMLSpanElement>`
### `onDragStartCapture: DragEventHandler<HTMLSpanElement>`
### `onDrop: DragEventHandler<HTMLSpanElement>`
### `onDropCapture: DragEventHandler<HTMLSpanElement>`
### `onDurationChange: ReactEventHandler<HTMLSpanElement>`
### `onDurationChangeCapture: ReactEventHandler<HTMLSpanElement>`
### `onEmptied: ReactEventHandler<HTMLSpanElement>`
### `onEmptiedCapture: ReactEventHandler<HTMLSpanElement>`
### `onEncrypted: ReactEventHandler<HTMLSpanElement>`
### `onEncryptedCapture: ReactEventHandler<HTMLSpanElement>`
### `onEnded: ReactEventHandler<HTMLSpanElement>`
### `onEndedCapture: ReactEventHandler<HTMLSpanElement>`
### `onError: ReactEventHandler<HTMLSpanElement>`
### `onErrorCapture: ReactEventHandler<HTMLSpanElement>`
### `onFocus: FocusEventHandler<HTMLSpanElement>`
### `onFocusCapture: FocusEventHandler<HTMLSpanElement>`
### `onGotPointerCapture: PointerEventHandler<HTMLSpanElement>`
### `onGotPointerCaptureCapture: PointerEventHandler<HTMLSpanElement>`
### `onInput: FormEventHandler<HTMLSpanElement>`
### `onInputCapture: FormEventHandler<HTMLSpanElement>`
### `onInvalid: FormEventHandler<HTMLSpanElement>`
### `onInvalidCapture: FormEventHandler<HTMLSpanElement>`
### `onKeyDown: KeyboardEventHandler<HTMLSpanElement>`
### `onKeyDownCapture: KeyboardEventHandler<HTMLSpanElement>`
### `onKeyPress: KeyboardEventHandler<HTMLSpanElement>`
### `onKeyPressCapture: KeyboardEventHandler<HTMLSpanElement>`
### `onKeyUp: KeyboardEventHandler<HTMLSpanElement>`
### `onKeyUpCapture: KeyboardEventHandler<HTMLSpanElement>`
### `onLoad: ReactEventHandler<HTMLSpanElement>`
### `onLoadCapture: ReactEventHandler<HTMLSpanElement>`
### `onLoadStart: ReactEventHandler<HTMLSpanElement>`
### `onLoadStartCapture: ReactEventHandler<HTMLSpanElement>`
### `onLoadedData: ReactEventHandler<HTMLSpanElement>`
### `onLoadedDataCapture: ReactEventHandler<HTMLSpanElement>`
### `onLoadedMetadata: ReactEventHandler<HTMLSpanElement>`
### `onLoadedMetadataCapture: ReactEventHandler<HTMLSpanElement>`
### `onLostPointerCapture: PointerEventHandler<HTMLSpanElement>`
### `onLostPointerCaptureCapture: PointerEventHandler<HTMLSpanElement>`
### `onMouseDown: MouseEventHandler<HTMLSpanElement>`
### `onMouseDownCapture: MouseEventHandler<HTMLSpanElement>`
### `onMouseEnter: MouseEventHandler<HTMLSpanElement>`
### `onMouseLeave: MouseEventHandler<HTMLSpanElement>`
### `onMouseMove: MouseEventHandler<HTMLSpanElement>`
### `onMouseMoveCapture: MouseEventHandler<HTMLSpanElement>`
### `onMouseOut: MouseEventHandler<HTMLSpanElement>`
### `onMouseOutCapture: MouseEventHandler<HTMLSpanElement>`
### `onMouseOver: MouseEventHandler<HTMLSpanElement>`
### `onMouseOverCapture: MouseEventHandler<HTMLSpanElement>`
### `onMouseUp: MouseEventHandler<HTMLSpanElement>`
### `onMouseUpCapture: MouseEventHandler<HTMLSpanElement>`
### `onPaste: ClipboardEventHandler<HTMLSpanElement>`
### `onPasteCapture: ClipboardEventHandler<HTMLSpanElement>`
### `onPause: ReactEventHandler<HTMLSpanElement>`
### `onPauseCapture: ReactEventHandler<HTMLSpanElement>`
### `onPlay: ReactEventHandler<HTMLSpanElement>`
### `onPlayCapture: ReactEventHandler<HTMLSpanElement>`
### `onPlaying: ReactEventHandler<HTMLSpanElement>`
### `onPlayingCapture: ReactEventHandler<HTMLSpanElement>`
### `onPointerCancel: PointerEventHandler<HTMLSpanElement>`
### `onPointerCancelCapture: PointerEventHandler<HTMLSpanElement>`
### `onPointerDown: PointerEventHandler<HTMLSpanElement>`
### `onPointerDownCapture: PointerEventHandler<HTMLSpanElement>`
### `onPointerEnter: PointerEventHandler<HTMLSpanElement>`
### `onPointerEnterCapture: PointerEventHandler<HTMLSpanElement>`
### `onPointerLeave: PointerEventHandler<HTMLSpanElement>`
### `onPointerLeaveCapture: PointerEventHandler<HTMLSpanElement>`
### `onPointerMove: PointerEventHandler<HTMLSpanElement>`
### `onPointerMoveCapture: PointerEventHandler<HTMLSpanElement>`
### `onPointerOut: PointerEventHandler<HTMLSpanElement>`
### `onPointerOutCapture: PointerEventHandler<HTMLSpanElement>`
### `onPointerOver: PointerEventHandler<HTMLSpanElement>`
### `onPointerOverCapture: PointerEventHandler<HTMLSpanElement>`
### `onPointerUp: PointerEventHandler<HTMLSpanElement>`
### `onPointerUpCapture: PointerEventHandler<HTMLSpanElement>`
### `onProgress: ReactEventHandler<HTMLSpanElement>`
### `onProgressCapture: ReactEventHandler<HTMLSpanElement>`
### `onRateChange: ReactEventHandler<HTMLSpanElement>`
### `onRateChangeCapture: ReactEventHandler<HTMLSpanElement>`
### `onReset: FormEventHandler<HTMLSpanElement>`
### `onResetCapture: FormEventHandler<HTMLSpanElement>`
### `onScroll: UIEventHandler<HTMLSpanElement>`
### `onScrollCapture: UIEventHandler<HTMLSpanElement>`
### `onSeeked: ReactEventHandler<HTMLSpanElement>`
### `onSeekedCapture: ReactEventHandler<HTMLSpanElement>`
### `onSeeking: ReactEventHandler<HTMLSpanElement>`
### `onSeekingCapture: ReactEventHandler<HTMLSpanElement>`
### `onSelect: ReactEventHandler<HTMLSpanElement>`
### `onSelectCapture: ReactEventHandler<HTMLSpanElement>`
### `onStalled: ReactEventHandler<HTMLSpanElement>`
### `onStalledCapture: ReactEventHandler<HTMLSpanElement>`
### `onSubmit: FormEventHandler<HTMLSpanElement>`
### `onSubmitCapture: FormEventHandler<HTMLSpanElement>`
### `onSuspend: ReactEventHandler<HTMLSpanElement>`
### `onSuspendCapture: ReactEventHandler<HTMLSpanElement>`
### `onTimeUpdate: ReactEventHandler<HTMLSpanElement>`
### `onTimeUpdateCapture: ReactEventHandler<HTMLSpanElement>`
### `onTouchCancel: TouchEventHandler<HTMLSpanElement>`
### `onTouchCancelCapture: TouchEventHandler<HTMLSpanElement>`
### `onTouchEnd: TouchEventHandler<HTMLSpanElement>`
### `onTouchEndCapture: TouchEventHandler<HTMLSpanElement>`
### `onTouchMove: TouchEventHandler<HTMLSpanElement>`
### `onTouchMoveCapture: TouchEventHandler<HTMLSpanElement>`
### `onTouchStart: TouchEventHandler<HTMLSpanElement>`
### `onTouchStartCapture: TouchEventHandler<HTMLSpanElement>`
### `onTransitionEnd: TransitionEventHandler<HTMLSpanElement>`
### `onTransitionEndCapture: TransitionEventHandler<HTMLSpanElement>`
### `onVolumeChange: ReactEventHandler<HTMLSpanElement>`
### `onVolumeChangeCapture: ReactEventHandler<HTMLSpanElement>`
### `onWaiting: ReactEventHandler<HTMLSpanElement>`
### `onWaitingCapture: ReactEventHandler<HTMLSpanElement>`
### `onWheel: WheelEventHandler<HTMLSpanElement>`
### `onWheelCapture: WheelEventHandler<HTMLSpanElement>`
### `placeholder: string`
### `prefix: string`
### `property: string`
### `radioGroup: string`
### `ref: "null" | function | RefObject<HTMLSpanElement>`
### `resource: string`
### `results: number`
### `role: AriaRole`
### `security: string`
### `slot: string`
### `spellCheck: Booleanish`
### `style: CSSProperties`
### `suppressContentEditableWarning: boolean`
### `suppressHydrationWarning: boolean`
### `sx: SxProps<Theme>`
The system prop that allows defining system overrides as well as additional CSS styles.
### `tabIndex: number`
### `title: string`
### `translate: "yes" | "no"`
### `typeof: string`
### `unselectable: "on" | "off"`
### `variant: "text" | "rectangular" | "rounded" | "circular"`
The type of content that will be rendered.
### `vocab: string`
### `width: string | number`
Width of the skeleton.
Useful when the skeleton is inside an inline element with no width of its own.