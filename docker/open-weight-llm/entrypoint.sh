#!/bin/sh
set -eu
export LC_ALL=C
. /opt/arsnova/validate-token.sh
. /opt/arsnova/validate-bind.sh

model_path=/models/Qwen3-4B-Instruct-2507-Q4_K_M.gguf
model_sha256=3605803b982cb64aead44f6c1b2ae36e3acdb41d8e46c8a94c6533bc4c67e597
transport=${OPEN_WEIGHT_LLM_TRANSPORT:-unix}
token=${OPEN_WEIGHT_LLM_TOKEN:-}
threads=${OPEN_WEIGHT_LLM_THREADS:-4}

validate_open_weight_llm_token "$token"
case "$threads" in
  '' | *[!0-9]*)
    echo 'OPEN_WEIGHT_LLM_THREADS must be an integer from 1 to 4' >&2
    exit 64
    ;;
esac
if [ "$threads" -lt 1 ] || [ "$threads" -gt 4 ]; then
  echo 'OPEN_WEIGHT_LLM_THREADS must be an integer from 1 to 4' >&2
  exit 64
fi
if [ ! -r "$model_path" ]; then
  echo "Pinned GGUF is not readable at $model_path" >&2
  exit 66
fi
actual_sha256=$(sha256sum "$model_path" | cut -d ' ' -f 1)
if [ "$actual_sha256" != "$model_sha256" ]; then
  echo 'Pinned GGUF checksum mismatch' >&2
  exit 65
fi

set -- \
  /app/llama-server \
  --model "$model_path" \
  --alias qwen3-4b-instruct-2507-q4_k_m \
  --parallel 1 \
  --ctx-size 4096 \
  --n-predict 768 \
  --threads "$threads" \
  --threads-batch "$threads" \
  --no-webui \
  --slots \
  --api-key "$token" \
  --reasoning off \
  --n-gpu-layers 0 \
  --slot-prompt-similarity 0 \
  --jinja \
  --offline \
  --cors-origins localhost \
  --no-cors-credentials \
  --log-verbosity 2

case "$transport" in
  unix)
    socket_path=${OPEN_WEIGHT_LLM_SOCKET_PATH:-/run/open-weight-llm/llm.sock}
    case "$socket_path" in
      /*.sock) ;;
      *)
        echo 'OPEN_WEIGHT_LLM_SOCKET_PATH must be an absolute .sock path' >&2
        exit 64
        ;;
    esac
    rm -f "$socket_path"
    exec "$@" --host "$socket_path"
    ;;
  http)
    bind_address=${OPEN_WEIGHT_LLM_BIND_ADDRESS:-}
    validate_open_weight_llm_bind_address "$bind_address"
    exec "$@" --host "$bind_address" --port 8080
    ;;
  *)
    echo 'OPEN_WEIGHT_LLM_TRANSPORT must be unix or http' >&2
    exit 64
    ;;
esac
