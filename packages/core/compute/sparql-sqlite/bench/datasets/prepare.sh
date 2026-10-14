#!/usr/bin/env bash
#
# Copyright 2026 DXOS.org
#
# Fetches and builds the dataset generators into bench/.cache (gitignored), generates the datasets as
# N-Triples and instantiates their query templates (bench/datasets/build-queries.mjs). Idempotent: each step
# is skipped when its output exists. Needs java 11+, g++, libboost-date-time-dev and /usr/share/dict/words
# (WatDiv), curl, gunzip.
#
#   bench/datasets/prepare.sh [bsbm|lubm|watdiv|dblp|all]

set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CACHE="$HERE/../.cache"
DL="$CACHE/dl"
TOOLS="$CACHE/tools"
DATA="$CACHE/data"
mkdir -p "$DL" "$TOOLS" "$DATA" "$CACHE/build"
WHICH="${1:-all}"

fetch() { [ -s "$2" ] || curl -sSfL -o "$2" "$1"; }

if [[ "$WHICH" == all || "$WHICH" == bsbm ]]; then
  # BSBM tools 0.2 (the V3 generator and test driver).
  fetch "https://sourceforge.net/projects/bsbmtools/files/latest/download" "$DL/bsbmtools.zip"
  [ -d "$TOOLS/bsbmtools-0.2" ] || unzip -qo "$DL/bsbmtools.zip" -d "$TOOLS"
  BSBM="$TOOLS/bsbmtools-0.2"
  CP=$(ls "$BSBM"/lib/*.jar | paste -sd:)
  [ -f "$CACHE/build/BsbmParams.class" ] || javac -nowarn -cp "$CP" -d "$CACHE/build" "$HERE/BsbmParams.java"
  # 2785 products ≈ 1M triples, 14000 ≈ 5M (-fc materialises the rdfs:subClassOf closure of product types).
  for products in 2785 14000; do
    if [ ! -s "$DATA/bsbm-$products.nt" ]; then
      (cd "$BSBM" && ./generate -fc -pc "$products" -s nt -fn "$DATA/bsbm-$products" -dir "$DATA/bsbm-$products-td")
    fi
    [ -s "$DATA/bsbm-$products.queries.jsonl" ] ||
      java -cp "$CP:$CACHE/build" BsbmParams "$BSBM" "$DATA/bsbm-$products-td" 3 > "$DATA/bsbm-$products.queries.jsonl"
  done
fi

if [[ "$WHICH" == all || "$WHICH" == lubm ]]; then
  # UBA 1.7 generator; Jena riot converts its RDF/XML to N-Triples and materialises the RDFS closure.
  fetch "https://swat.cse.lehigh.edu/projects/lubm/uba1.7.zip" "$DL/uba1.7.zip"
  fetch "https://swat.cse.lehigh.edu/onto/univ-bench.owl" "$DL/univ-bench.owl"
  fetch "https://archive.apache.org/dist/jena/binaries/apache-jena-5.6.0.tar.gz" "$DL/jena.tar.gz"
  [ -d "$TOOLS/uba" ] || (mkdir -p "$TOOLS/uba" && unzip -qo "$DL/uba1.7.zip" -d "$TOOLS/uba")
  [ -d "$TOOLS/apache-jena-5.6.0" ] || tar xzf "$DL/jena.tar.gz" -C "$TOOLS"
  if [ ! -s "$DATA/lubm10.nt" ]; then
    mkdir -p "$DATA/lubm10"
    (cd "$DATA/lubm10" && java -cp "$TOOLS/uba/classes" edu.lehigh.swat.bench.uba.Generator -univ 10 \
      -onto http://swat.cse.lehigh.edu/onto/univ-bench.owl > gen.log)
    # UBA joins paths with a backslash, so on Linux the files land next to the directory.
    for file in "$DATA"/lubm10\\*.owl; do mv "$file" "$DATA/lubm10/${file##*\\}"; done
    JENA_HOME="$TOOLS/apache-jena-5.6.0" "$TOOLS/apache-jena-5.6.0/bin/riot" --syntax=rdfxml --output=ntriples \
      "$DATA"/lubm10/*.owl > "$DATA/lubm10.nt"
  fi
  if [ ! -s "$DATA/lubm10-rdfs.nt" ]; then
    JENA_HOME="$TOOLS/apache-jena-5.6.0" "$TOOLS/apache-jena-5.6.0/bin/riot" --rdfs="$DL/univ-bench.owl" \
      --output=ntriples "$DATA/lubm10.nt" > "$DATA/lubm10-rdfs.nt"
  fi
fi

if [[ "$WHICH" == all || "$WHICH" == watdiv ]]; then
  # WatDiv v0.6 C++ generator; `saved.txt` from the data run is what query instantiation samples from.
  fetch "https://dsg.uwaterloo.ca/watdiv/watdiv_v06.tar" "$DL/watdiv_v06.tar"
  [ -d "$TOOLS/watdiv" ] || tar xf "$DL/watdiv_v06.tar" -C "$TOOLS"
  WATDIV="$TOOLS/watdiv"
  [ -x "$WATDIV/bin/Release/watdiv" ] || make -C "$WATDIV" -j4
  for scale in 10 50; do
    if [ ! -s "$DATA/watdiv$scale.nt" ]; then
      (cd "$WATDIV/bin/Release" && ./watdiv -d ../../model/wsdbm-data-model.txt "$scale" > "$DATA/watdiv$scale.nt" &&
        mv saved.txt "$DATA/watdiv$scale.saved.txt")
    fi
    if [ ! -s "$DATA/watdiv$scale.queries.txt" ]; then
      cp "$DATA/watdiv$scale.saved.txt" "$WATDIV/bin/Release/saved.txt"
      for template in L1 L2 L3 L4 L5 S1 S2 S3 S4 S5 S6 S7 F1 F2 F3 F4 F5 C1 C2 C3; do
        echo "#TEMPLATE $template"
        (cd "$WATDIV/bin/Release" && ./watdiv -q ../../model/wsdbm-data-model.txt "../../testsuite/$template.txt" 3 1)
      done > "$DATA/watdiv$scale.queries.txt"
    fi
  done
fi

if [[ "$WHICH" == all || "$WHICH" == dblp ]]; then
  # The first 6M lines of the full dblp.nt.gz dump (5.4 GB): about 100k publication records with signatures.
  [ -s "$DATA/dblp-6m.nt" ] || (curl -sSL https://dblp.org/rdf/dblp.nt.gz | gunzip -c | head -n 6000000 > "$DATA/dblp-6m.nt" || true)
fi

node "$HERE/build-queries.mjs" "$DATA"
