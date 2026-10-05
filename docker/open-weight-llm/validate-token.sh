#!/bin/sh

validate_open_weight_llm_token() {
  token_to_validate=$1
  if [ -z "$token_to_validate" ] || [ "${#token_to_validate}" -lt 32 ] || [ "${#token_to_validate}" -gt 512 ]; then
    echo 'OPEN_WEIGHT_LLM_TOKEN must contain 32 to 512 URL-safe ASCII characters' >&2
    return 64
  fi
  case "$token_to_validate" in
    *[!A-Za-z0-9._~-]*)
      echo 'OPEN_WEIGHT_LLM_TOKEN must contain URL-safe ASCII characters only' >&2
      return 64
      ;;
  esac
}
