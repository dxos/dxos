# @dxos/plugin-library

A reading-list content plugin. Defines the `Book` ECHO type, CRUD and views hoisted into the
navigation tree's content group, and a BookHive-backed create-form autocomplete.

The public subset of `Book` carries an atproto record annotation (`buzz.bookhive.book`), so the
generic `@dxos/plugin-atproto` companion can publish a book to the user's PDS. Private fields
(notes, ownership, personal tags) are unmarked and never cross the publishing boundary.
