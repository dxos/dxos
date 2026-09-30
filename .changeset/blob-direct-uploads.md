---
'@dxos/echo': minor
'@dxos/plugin-file': minor
---

Files can now be created from bytes uploaded directly to blob storage, without the bytes passing through the caller. `Blob.fromUpload(uploadId)` adopts an upload that a third party has already written to the store over a signed URL, and reports the size and content type the store observed rather than trusting the caller — nothing in the client process ever sees the bytes. Blob backends opt in by implementing `BlobBackend.adoptUpload`; the hosted edge backend does, via the new `BlobTransport.finalizeUpload`. Inline storage rejects the call, since it keeps bytes on the ECHO object itself and has nowhere for an upload to have gone.

The new `org.dxos.operation.file.createFromUpload` operation exposes this to agents: given an upload id, it validates the media type the service reports and creates the `File` object. It is the third arm alongside `createFromSource`'s `base64` and `http`, and the one that fits a large file on an agent's own disk — a screenshot or a screen recording costs the same few tokens as a short string, where inlining it as a tool argument would mean generating the bytes one token at a time.
