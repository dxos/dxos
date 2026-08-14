---
'@dxos/protocols': minor
---

Delete four more protobuf definitions confirmed to be entirely dead: `value.proto` (`Value`/`Stats`,
never used as a field type anywhere), `echo/filter.proto` (`Filter`/`QueryOptions`, only reachable via
`QueryRequest`'s `@deprecated` `filter` field, which no caller ever set and no handler ever read),
`echo/model/document.proto` (the pre-Automerge DocumentModel mutation format), and `EchoObjectBatch`
from `echo/object.proto` (`EchoObject`/`MutationMeta` in the same file are still live and unaffected).

This also removes the now-provably-dead call chain each one anchored: `FeedMessage.Payload`'s `data`
variant and the `DataMessage` message it carried (superseded entirely by direct Automerge persistence —
no feed-writer in the repo ever constructed one), and `SpaceCache`/`SpaceMetadata.cache` (populated by
`IMetadataStore.setCache`, which had zero call sites) along with the `Space.cache` RPC response field
it fed, since space cache was never actually written by any code path.
