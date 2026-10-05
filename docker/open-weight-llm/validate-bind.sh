#!/bin/sh

validate_open_weight_llm_bind_address() {
  bind_address_to_validate=$1
  case "$bind_address_to_validate" in
    127.* | ::1 | 10.* | 192.168.* | 172.1[6-9].* | 172.2[0-9].* | 172.3[01].* | [fF][cCdD]*:*)
      return 0
      ;;
    *)
      echo 'OPEN_WEIGHT_LLM_BIND_ADDRESS must be an explicit loopback or private address' >&2
      return 64
      ;;
  esac
}
