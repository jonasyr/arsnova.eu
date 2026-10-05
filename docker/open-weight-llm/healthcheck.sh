#!/bin/sh
set -eu

token=${OPEN_WEIGHT_LLM_TOKEN:-}
transport=${OPEN_WEIGHT_LLM_TRANSPORT:-unix}

case "$transport" in
  unix)
    socket_path=${OPEN_WEIGHT_LLM_SOCKET_PATH:-/run/open-weight-llm/llm.sock}
    [ "$(stat --format='%a' "$socket_path" 2>/dev/null || true)" = 770 ] || exit 1
    exec curl --fail --silent --show-error --max-time 4 \
      --unix-socket "$socket_path" \
      --header "Authorization: Bearer $token" \
      http://localhost/health
    ;;
  http)
    bind_address=${OPEN_WEIGHT_LLM_BIND_ADDRESS:-}
    case "$bind_address" in
      *:*) health_host="[$bind_address]" ;;
      *) health_host=$bind_address ;;
    esac
    exec curl --fail --silent --show-error --max-time 4 \
      --header "Authorization: Bearer $token" \
      "http://$health_host:8080/health"
    ;;
  *) exit 1 ;;
esac
