# @dxos/pipeline-email

A worked [`@dxos/pipeline`](../pipeline) over the [Enron email dataset](https://huggingface.co/datasets/corbt/enron-emails):
a parquet source is streamed through summarize (LLM), contact-extract, and stats stages into an ECHO
database. `emailToMessage` maps a dataset row onto an ECHO `Message`.

## Testing

The `email-pipeline` test is gated on the dataset (via `ROOT_DIR`) and a running Ollama; it is skipped
in CI and un-provisioned checkouts. Install ollama, then run the `setup` script.

```bash
moon run pipeline-email:setup
moon run pipeline-email:test -- src/email-pipeline.test.ts
```
