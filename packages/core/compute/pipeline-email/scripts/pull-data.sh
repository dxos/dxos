#!/bin/sh
set -e

# Provision the local fixtures for the ROOT_DIR-gated email-pipeline test:
#   1. the Enron email dataset (git-ignored, under ./data), and
#   2. the Ollama model used by the summarize stage.
# Run `moon run pipeline-email:setup`, then point ROOT_DIR at the checkout:
#   ROOT_DIR="$(pwd)/data/enron-emails" moon run pipeline-email:test -f -- src/email-pipeline.test.ts

mkdir -p data
if [ -d data/enron-emails/.git ]; then
  echo "Dataset already present at data/enron-emails."
else
  git clone https://huggingface.co/datasets/corbt/enron-emails data/enron-emails
fi

echo "ROOT_DIR=$(pwd)/data/enron-emails"
