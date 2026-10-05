# llama.cpp b10524, multi-arch manifest verified 2026-10-05.
FROM ghcr.io/ggml-org/llama.cpp:server-b10524@sha256:57e505f69c3a55fa5dd9c15fced47cff7a899f5b5b504ea93d75b2f401b87830

LABEL org.opencontainers.image.title="arsnova.eu private open-weight LLM runtime" \
      org.opencontainers.image.description="Pinned CPU-only llama-server for arsnova.eu runtime jobs" \
      org.opencontainers.image.source="https://github.com/kqc-real/arsnova.eu" \
      org.opencontainers.image.licenses="MIT"

USER root
RUN groupadd --gid 65532 arsnova-llm \
    && useradd --uid 65532 --gid 65532 --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin arsnova-llm \
    && mkdir -p /opt/arsnova /run/open-weight-llm \
    && chown 65532:65532 /run/open-weight-llm

COPY entrypoint.sh healthcheck.sh validate-bind.sh validate-token.sh model.sha256 /opt/arsnova/
RUN chmod 0555 /opt/arsnova/entrypoint.sh /opt/arsnova/healthcheck.sh /opt/arsnova/validate-bind.sh /opt/arsnova/validate-token.sh \
    && chmod 0444 /opt/arsnova/model.sha256

USER 65532:65532
ENTRYPOINT ["/opt/arsnova/entrypoint.sh"]
HEALTHCHECK --interval=15s --timeout=5s --start-period=180s --retries=5 \
  CMD ["/opt/arsnova/healthcheck.sh"]
