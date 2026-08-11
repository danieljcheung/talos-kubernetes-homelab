FROM python:3.12.11-alpine3.22@sha256:efcdfa6a6b2fd2afb9c7dfa9a5b288a6f68338b5cfdebe6b637d986067d85757

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN addgroup -S -g 10001 app \
    && adduser -S -D -H -u 10001 -G app app \
    && python -m pip install --no-cache-dir --disable-pip-version-check "psycopg[binary]==3.2.9"

WORKDIR /app
COPY manifests/cozy-friends-site/approval-api.py /app/approval-api.py

USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["python", "/app/approval-api.py"]
