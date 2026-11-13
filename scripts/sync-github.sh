#!/usr/bin/env bash

set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 \"commit message\"" >&2
  exit 1
fi

commit_message="$*"
remote="origin"

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if ! branch="$(git symbolic-ref --quiet --short HEAD)"; then
  echo "Cannot sync a detached HEAD. Switch to a branch first." >&2
  exit 1
fi

if ! git remote get-url "$remote" >/dev/null 2>&1; then
  echo "Remote '$remote' is not configured." >&2
  exit 1
fi

echo "Fetching $remote..."
git fetch --prune "$remote"

echo "Staging local changes..."
git add -A

if ! git diff --cached --quiet; then
  echo "Creating commit: $commit_message"
  git commit -m "$commit_message"
else
  echo "No local file changes to commit."
fi

if git ls-remote --exit-code --heads "$remote" "$branch" >/dev/null 2>&1; then
  echo "Integrating remote $remote/$branch..."
  git pull --rebase "$remote" "$branch"
fi

echo "Pushing $branch to $remote..."
git push --set-upstream "$remote" "$branch"

git status --short --branch
