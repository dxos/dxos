# Card

- PRIORITY: HIGH
  - [ ] Migrate kanban + search list + inbox + project
  - [ ] Drag to document

- Simplify and use cards everywhere as primary UI.
- Universal DND.
- https://m2.material.io/components/cards#anatomy

## API

- react-ui-mosaic
  - [ ] Menu (via context).
  - [ ] Form and list (plugin-preview).
  - [x] Card components; impl. all use cases (Toolbar, Poster, Section).
  - [x] Drag handle/menu (via surface)
  - [x] Remove dialogStyles fragment exports (plugin-inbox, plugin-navtree, plugin-space).

## Usage

- plugin-preview
  - [ ] Remove generic CardComponents (CardHeader, CardRow, CardLink, CardSubjectMenu)

- plugin-kanban
  - [ ] Retrofit new CardStack
  - [ ] Remove CardDragPreview? (used in react-ui-kanban)

- plugin-inbox
  - [ ] Data-driven components via surfaces (RelatedToOrganization, RelatedToContact)

- plugin-project
  - [ ] ProjectSettings: Removed used to use cardChrome, cardText
