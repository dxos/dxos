#!/bin/sh
set -e

# Pull the local (Ollama) open-weight models for the research ladder — an ascending size sweep used to
# find, per task (labeling, categorization, summaries, drafts), the smallest model that matches a
# premier remote. The ladder INCLUDES reasoning models (qwen3, gpt-oss): their chain-of-thought both
# raises latency and can break strict JSON, but measuring that size/latency/accuracy tradeoff is the
# whole point of the sweep (benches parse leniently — first JSON object/array — to tolerate it). Each
# tag corresponds to a DXN in the DXOS model catalog (packages/core/compute/ai/src/Model.ts); keep the
# two in sync.
#
# Run `moon run pipeline-email:pull-models`. Override the set with a space-separated MODELS env var:
#   MODELS="llama3.2:3b qwen3:8b" moon run pipeline-email:pull-models

# Ollama tags, one per line (ascending size). DXN mapping (Model.ts):
#   llama3.2:3b -> com.meta.model.llama-3-2-3b.instruct     (~3B, non-reasoning floor)
#   qwen3:8b    -> com.alibaba.model.qwen-3-8b.default      (~8B, modern small workhorse)
#   gemma4:12b  -> com.google.model.gemma-4-12b.default     (~12B, mid)
#   gpt-oss:20b -> com.openai.model.gpt-oss-20b.default     (~20B, strong reasoning + native tool-use)
#   qwen3:30b   -> com.alibaba.model.qwen-3-30b.default     (30B MoE, ~3B active — near-frontier at low latency)
MODELS="${MODELS:-$(cat <<'EOF'
llama3.2:3b
qwen3:8b
gemma4:12b
gpt-oss:20b
qwen3:30b
EOF
)}"

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
