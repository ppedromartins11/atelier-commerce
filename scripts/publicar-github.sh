#!/usr/bin/env bash
set -euo pipefail

REPO="ppedromartins11/atelier-commerce"

if ! command -v gh >/dev/null 2>&1; then
  echo "Instale a GitHub CLI: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Autentique-se usando: gh auth login" >&2
  exit 1
fi

if [ ! -d .git ]; then
  git init -b main
fi

if ! git config user.name >/dev/null || ! git config user.email >/dev/null; then
  echo "Configure git user.name e user.email antes da publicação." >&2
  exit 1
fi

git add .
if ! git diff --cached --quiet; then
  git commit -m "feat: criar tema ecommerce base Shopify 2.0"
fi

if gh repo view "$REPO" >/dev/null 2>&1; then
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/${REPO}.git"
  fi
  git push -u origin main
else
  gh repo create "$REPO" --public --source=. --remote=origin --push
fi

echo "Publicado em: https://github.com/${REPO}"
