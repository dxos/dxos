//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Role from '@dxos/app-framework/Role';

import type * as AppSurface from '../ui/components/AppSurface/AppSurface.ts';

// Role tokens carry only their NSID at runtime and import their data types type-only, so a `dx.config.ts`
// (evaluated headlessly at build time) can name roles without loading the React surface toolkit.

/** Role token for the `article` role. Subject defaults to `any` until narrowed
 * via `AppSurface.object`, `AppSurface.literal`, or `AppSurface.subject`. Extra passthrough
 * props are permitted. */
export const Article: Role.Role<AppSurface.ArticleData<any>> = Role.make('org.dxos.role.article');

/** Role token for the `section` role. */
export const Section: Role.Role<AppSurface.SectionData<any>> = Role.make('org.dxos.role.section');

/** Role token for the `slide` role. Shares the section data shape. */
export const Slide: Role.Role<AppSurface.SectionData<any>> = Role.make('org.dxos.role.slide');

/** Role token for the `tabpanel` role. Shares the article data shape. */
export const Tabpanel: Role.Role<AppSurface.ArticleData<any>> = Role.make('org.dxos.role.tabpanel');

/**
 * Role token for the `related` role. Related panels may render in both
 * plank (attendable) and popover (non-attendable) contexts, so `attendableId`
 * is optional here.
 */
export const Related: Role.Role<{ attendableId?: string; subject: any }> = Role.make('org.dxos.role.related');

/**
 * Role token for the `objectProperties` role (per-object configuration panel).
 * Distinct from Section: no `attendableId` requirement.
 */
export const ObjectProperties: Role.Role<AppSurface.ObjectPropertiesData<any>> = Role.make(
  'org.dxos.role.objectProperties',
);

/**
 * Role token for the card header's leading depiction — a person's avatar, an organization's logo,
 * a type's glyph.
 *
 * Scoped to the card deliberately, rather than declared once per type: how an object is depicted
 * depends on the space it gets. A 6-unit card block affords initials or a photograph; a 16px navtree
 * row does not, and those surfaces keep resolving `IconAnnotation` through `Obj.getIcon`. A type
 * contributing here says how it looks IN A CARD, and says nothing about anywhere else.
 *
 * Unlike {@link CardContent}, a miss is not "render nothing" — every object needs some depiction —
 * so hosts check `Surface.useIsAvailable` and fall back. `CardIconSlot` packages that pair.
 */
export const CardIcon: Role.Role<AppSurface.CardData<any>> = Role.make('org.dxos.role.cardIcon');

/** Role token for the card slot. */
export const CardContent: Role.Role<AppSurface.CardData<any>> = Role.make('org.dxos.role.cardContent');

/**
 * Card header menu items a type contributes. The surface renders nothing: it registers items with the
 * host's `menu` via `useMenuContribution`, so hosts render it through `CardMenuSlot`.
 */
export const CardMenu: Role.Role<AppSurface.CardMenuData<any>> = Role.make('org.dxos.role.cardMenu');

/**
 * Role token for the `cardMasonry` role: several objects laid out as cards.
 *
 * The host supplies the objects — a task's artifacts, a record's attachments — rather than the
 * surface deriving them from a subject, which is what separates this from {@link Related}: the
 * caller already knows what belongs in the grid and only wants it rendered.
 */
export const CardMasonry: Role.Role<AppSurface.CardMasonryData> = Role.make('org.dxos.role.cardMasonry');

/** Role token for the `dialog` role. */
export const Dialog: Role.Role<AppSurface.DialogData> = Role.make('org.dxos.role.dialog');

/** Role token for the `popover` role. */
export const Popover: Role.Role<AppSurface.DialogData> = Role.make('org.dxos.role.popover');

/** Role token for the `navigation` role. */
export const Navigation: Role.Role<AppSurface.NavigationData> = Role.make('org.dxos.role.navigation');

/** Role token for the `menuFooter` role (was `menu-footer`). */
export const MenuFooter: Role.Role<AppSurface.MenuFooterData<unknown>> = Role.make('org.dxos.role.menuFooter');

/** Role token for the `navbarEnd` role (was `navbar-end`). */
export const NavbarEnd: Role.Role<AppSurface.NavbarEndData<unknown>> = Role.make('org.dxos.role.navbarEnd');

/** Role token for the `documentTitle` role (was `document-title`). */
export const DocumentTitle: Role.Role<AppSurface.DocumentTitleData<unknown>> = Role.make('org.dxos.role.documentTitle');

/** Role token for the `statusIndicator` role (was `status-indicator`). */
export const StatusIndicator: Role.Role<Record<string, unknown>> = Role.make('org.dxos.role.statusIndicator');

/** The deck's bottom drawer; one contributor renders at a time. */
export const Drawer: Role.Role<Record<string, unknown>> = Role.make('org.dxos.role.drawer');

/**
 * Slot for the devtools-overview sub-surface. Defined here (not in plugin-devtools) so public
 * contributor plugins can target it without depending on the private devtools plugin.
 */
export const DevtoolsOverview: Role.Role<Record<string, unknown>> = Role.make('org.dxos.role.devtoolsOverview');

/** Role token for the `formInput` role (was `form-input`). */
export const FormInput: Role.Role<AppSurface.FormInputData> = Role.make('org.dxos.role.formInput');

/** Role token for the `navtreeItemEnd` role (was `navtree-item-end`). */
export const NavtreeItemEnd: Role.Role<AppSurface.NavtreeItemEndData> = Role.make('org.dxos.role.navtreeItemEnd');

/** Slot for choosing known contacts to admit to a space; filled by the client plugin. */
export const ContactPicker: Role.Role<AppSurface.ContactPickerData> = Role.make('org.dxos.role.contactPicker');

/** Slot for a space invitation carried by a message (see `SpaceInvitationMessage`); filled by the client plugin. */
export const SpaceInvitation: Role.Role<AppSurface.SpaceInvitationData> = Role.make('org.dxos.role.spaceInvitation');

/** Role token for the `searchInput` role (was `search-input`). */
export const SearchInput: Role.Role<Record<string, unknown>> = Role.make('org.dxos.role.searchInput');

/**
 * Creates a role token for a deck companion variant. Both the deck consumer
 * (building the `<Surface type={...} />`) and contributing plugins (registering
 * via `Surface.create({ filter: AppSurface.subject(AppSurface.deckCompanion(id), ...) })`)
 * must call this factory with the same variant id so they agree on the dispatch NSID.
 *
 * Variant ids must be camelCase alphanumeric (DXN rule: no hyphens in the final segment).
 * The deck passes the companion's graph node `id`, which is the surface's attendable id.
 */
export const deckCompanion = (variant: string): Role.Role<{ id?: string; subject?: any }> => {
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(variant)) {
    throw new Error(
      `Invalid deck companion variant id: "${variant}". Must be camelCase alphanumeric (no hyphens or underscores).`,
    );
  }
  return Role.make(`org.dxos.role.deckCompanion.${variant}` as any);
};
