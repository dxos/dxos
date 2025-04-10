# Search

## Design

- The client continually writes Search events to a User-specific OUTBOUND queue that is consumed by the Search service.
- Search events include search terms, the current Attention status (viewed documents), focus metadata (e.g., cursor position), and other metadata (e.g., location).
- The Search service routes events to one or more Resolvers, which attampt to match the event with internal or external data objects.
- Objects are written to a Results stream which is synchronized back to the client.

