#!/bin/sh
set -e

# Provision the local fixtures for the ROOT_DIR-gated email-pipeline test:
#   1. the Enron email dataset (git-ignored, under ./data), and
#   2. the Ollama model used by the summarize stage.
# Run `moon run pipeline:setup`, then point ROOT_DIR at the checkout:
#   ROOT_DIR="$(pwd)/data/enron-emails" moon run pipeline:test -f -- src/testing/email-pipeline.test.ts

# Ollama model tag to pull; must correspond to the OLLAMA_MODEL DXN used by the test
# (default 'gpt-oss:20b' ↔ com.openai.model.gpt-oss-20b.default). Override for a different model, e.g.
# OLLAMA_MODEL_TAG=llama3.2:1b (↔ OLLAMA_MODEL=com.meta.model.llama-3-2-1b.instruct).
OLLAMA_MODEL_TAG="${OLLAMA_MODEL_TAG:-gpt-oss:20b}"

mkdir -p data
if [ -d data/enron-emails/.git ]; then
  echo "Dataset already present at data/enron-emails."
else
  git clone https://huggingface.co/datasets/corbt/enron-emails data/enron-emails
fi

if command -v ollama >/dev/null 2>&1; then
  echo "Pulling Ollama model: ${OLLAMA_MODEL_TAG}"
  ollama pull "${OLLAMA_MODEL_TAG}" || echo "Model pull failed — ensure the Ollama daemon is running (OLLAMA_ORIGINS=\"*\" ollama serve)."
else
  echo "Warning: 'ollama' not found on PATH; skipping model pull. Install from https://ollama.com then run: ollama pull ${OLLAMA_MODEL_TAG}"
fi

echo "ROOT_DIR=$(pwd)/data/enron-emails"
