---
description: Have Claude look for naming/structure drift that the scripted checks don't cover, and record it as proposals
argument-hint: "[area under client/dashboard, e.g. sites/settings] [focus, e.g. 'route files']"
---

You're finding small consistency drift in wp-calypso's `client/dashboard` (checkout path in `CCQ_REPO_PATH` from `.env`; repo and root in `ccq.config.json`). Scope: `$ARGUMENTS` (if empty, pick one area under `client/dashboard` that `data/discovered.json` hasn't covered yet and say which).

Focus for now: **folder structure and nomenclature**. For example: how sibling feature folders are laid out, what screens, routes, hooks, queries, dataviews `fields`/`actions` files are called, singular vs plural folder names, where `types.ts`/`constants.ts` sit, suffixes like `-screen`, `-page`, `-content`, `-modal`.

1. Read `data/findings.json` → `conventions` so you don't re-propose what's already checked, and `data/discovered.json` for earlier proposals.
2. Compare **siblings**: list the area's tree (`git -C <repo> ls-files`) and lay similar folders side by side. Majority pattern = candidate convention; outliers = findings. Read file contents only where names alone don't settle it. Keep the token budget modest; this is meant to be cheap and repeatable.
3. Only propose a convention when ≥3 siblings follow it and there are real outliers. Skip matters of taste with no majority.
4. Merge into `data/discovered.json` (create if missing), keeping existing entries:

```json
{
  "conventions": [
    { "id": "kebab-id", "title": "Short rule, `code` allowed", "category": "structure|naming",
      "description": "The rule, the majority evidence (counts), and why it helps.", "coveredAreas": [ "sites/settings" ] }
  ],
  "findings": [
    { "convention": "kebab-id", "file": "path/relative/to/client/dashboard", "message": "What's inconsistent.", "suggestion": "Concrete fix." }
  ]
}
```

5. If a proposal is mechanical enough to script, say so and sketch the check; scripted checks live in `conventions/*.mjs` (see the existing ones for the shape).
6. Run `npm run scan && npm run build`, then summarise what you found in a few lines. Don't publish unless asked.
