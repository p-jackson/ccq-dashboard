# ccq — Calypso Code Quality

Finds small consistency drift in [wp-calypso](https://github.com/Automattic/wp-calypso)'s `client/dashboard` and publishes it as a backlog dashboard on Spacefast.

The scan runs locally against a checkout (`CCQ_REPO_PATH`, see Setup). Spacefast only hosts the static result.

## How it works

- **Conventions** live in `conventions/*.mjs`, one per rule. Each has an `id`, `title`, `category` (`naming` / `structure`), `status` (`proposed` until you decide it's a rule, then `accepted`) and a `check( ctx )` that returns `{ checked, findings }`. `checked` is how many things the rule looked at, so the dashboard can show adherence.
- **Claude discovery**: `/discover [area] [focus]` in Claude Code compares sibling folders and records proposed conventions and findings in `data/discovered.json`. Mechanical proposals should graduate into a scripted check.
- **Tracking**: `data/tracking.json` holds statuses and PR links, keyed by finding ids that stay stable across scans.
- **Graduating**: once a convention is accepted and its backlog is small, move it into wp-calypso as an ESLint rule (or similar) so it stays fixed.

`ctx` exposes `files` and `dirs` (git-tracked, relative to `client/dashboard`), `read( file )`, `ast( file )` (TypeScript AST using the repo's own `typescript`), `lineOf( file, node )`, `has( file )` and `isSource` / `isTest` / `isStory`. `lib/ast.mjs` has export and JSX helpers.

## Usage

```sh
npm run scan                  # writes data/findings.json and appends data/history.json
npm run scan -- --only props-type-name
npm run build                 # dist/ = site + data.json (PR details via `gh`)
npm run publish               # creates or updates the public Space
npm run all                   # all three

npm run track -- pr https://github.com/Automattic/wp-calypso/pull/123 3f9c0d1a2b props-type-name
npm run track -- status claimed 3f9c0d1a2b
npm run track -- status wontfix 3f9c0d1a2b --note "Route test grouping is deliberate"
```

Update the wp-calypso checkout (`git pull`) before scanning; findings link to GitHub at the scanned commit.

## Setup

Copy `.env.example` to `.env` (gitignored) and fill it in:

```sh
CCQ_REPO_PATH=/path/to/wp-calypso   # checkout to scan
SPACEFAST_TOKEN=sfa_…               # only needed for publishing
SPACEFAST_TEAM=…                    # Spacefast team slug, ID or name
```

Real environment variables take precedence over `.env`.

The first `npm run publish` creates a public Space (`ccq-dashboard`) and saves its id in `data/space.json`. Later publishes update it.

## License

[GPL v2 or later](LICENSE), matching wp-calypso.
