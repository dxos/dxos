#!/bin/sh
set -e

# Pull the local (Ollama) models used to benchmark the email extraction pipeline. These are all
# non-reasoning instruction models — reasoning models (gpt-oss, deepseek-r1, qwen3) emit chain-of-
# thought that breaks strict JSON extraction and roughly doubles latency, so they are deliberately
# excluded here. Each tag corresponds to a DXN in the DXOS model catalog (packages/core/compute/ai/
# src/Model.ts); keep the two in sync.
#
# Run `moon run pipeline-email:pull-models`. Override the set with a space-separated MODELS env var:
#   MODELS="llama3.2:3b qwen2.5:7b" moon run pipeline-email:pull-models

# Space-separated Ollama tags. DXN mapping (Model.ts):
#   llama3.2:3b -> com.meta.model.llama-3-2-3b.instruct
#   qwen2.5:7b  -> com.alibaba.model.qwen-2-5-7b.instruct
#   gemma4:12b  -> com.google.model.gemma-4-12b.default
MODELS="${MODELS:-llama3.2:3b qwen2.5:7b gemma4:12b}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Error: 'ollama' not found on PATH. Install from https://ollama.com then re-run." >&2
  exit 1
fi

failed=""
for model in $MODELS; do
  echo "==> Pulling ${model}"
  if ollama pull "$model"; then
    echo "    ok: ${model}"
  else
    echo "    FAILED: ${model}" >&2
    failed="${failed} ${model}"
  fi
done

echo ""
echo "Installed models:"
ollama list

if [ -n "$failed" ]; then
  echo "" >&2
  echo "Some pulls failed:${failed}" >&2
  echo "Ensure the Ollama daemon is running (OLLAMA_ORIGINS=\"*\" ollama serve) and the tags exist." >&2
  exit 1
fi

echo ""
echo "All models pulled. Run the benchmark with:"
echo "  ROOT_DIR=\"\$(pwd)/data/enron-emails\" moon run pipeline-email:test -- src/testing/email-extraction.bench.test.ts"
