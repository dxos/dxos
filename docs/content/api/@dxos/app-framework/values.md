---
title: Values
---
# Values 

### [`Layout`](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/app-framework/src/plugins/common/layout.ts#L37)
Type: ZodObject&lt;object, "strip", ZodTypeAny, object, object&gt;

Basic state provided by a layout plugin.

Layout provides the state of global UI landmarks, such as the sidebar, dialog, and popover.
Generally only one dialog or popover should be open at a time, a layout plugin should manage this.
For other landmarks, such as toasts, rendering them in the layout prevents them from unmounting when navigating.

### [`Location`](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/app-framework/src/plugins/common/navigation.ts#L19)
Type: ZodObject&lt;object, "strip", ZodTypeAny, object, object&gt;

Basic state provided by a navigation plugin.

### [`Resource`](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/app-framework/src/plugins/common/translations.ts#L18)
Type: ZodRecord&lt;ZodString, ZodRecord&lt;ZodString, ZodUnion&lt;[ZodString, ZodRecord&lt;ZodString, ZodAny&gt;]&gt;&gt;&gt;

A resource is a collection of translations for a language.

### [`ResourceKey`](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/app-framework/src/plugins/common/translations.ts#L9)
Type: ZodUnion&lt;[ZodString, ZodRecord&lt;ZodString, ZodAny&gt;]&gt;



### [`ResourceLanguage`](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/app-framework/src/plugins/common/translations.ts#L12)
Type: ZodRecord&lt;ZodString, ZodUnion&lt;[ZodString, ZodRecord&lt;ZodString, ZodAny&gt;]&gt;&gt;



### [`Toast`](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/app-framework/src/plugins/common/layout.ts#L14)
Type: ZodObject&lt;object, "strip", ZodTypeAny, object, object&gt;



### [`defaultFileTypes`](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/app-framework/src/plugins/common/file.ts#L9)
Type: object



