# ccq — Calypso Code Quality

Finds small consistency drift in [wp-calypso](https://github.com/Automattic/wp-calypso)'s `client/dashboard` and publishes it as a backlog dashboard on Spacefast.

The scan runs locally against a checkout (`CCQ_REPO_PATH`, see Setup). Spacefast only hosts the static result.

## How it works

- **Conventions** live in `conventions/*.mjs`, one per rule. Each has an `id`, `title`, `category` (`naming` / `structure`), `status` (`proposed` until you decide it's a rule, then `accepted`) and a `check( ctx )` that returns `{ checked, findings }`. `checked` is how many things the rule looked at, so the dashboard can show adherence.
- **Claude discovery**: `/discover [area] [focus]` in Claude Code compares sibling folders and records proposed conventions and findings in `data/discovered.json`. Mechanical proposals should graduate into a scripted check.
- **Tracking**: `data/tracking.json` holds statuses and PR links, keyed by finding ids that stay stable across scans.
- **Graduating**: once a convention is accepted and its backlog is small, move it into wp-calypso as an ESLint rule (or similar) so it stays fixed.

`ctx` exposes `files` and `dirs` (git-tracked, relative to `client/dashboard`), `read( file )`, `ast( file )` (TypeScript AST), `lineOf( file, node )`, `has( file )` and `isSource` / `isTest` / `isStory`. `lib/ast.mjs` has export and JSX helpers.

## Usage

```sh
npm run scan                  # writes data/findings.json and appends data/history.json
npm run scan -- --only props-type-name
npm run build                 # dist/ = site + data.json (PR details via `gh`)
npm run publish               # creates or updates the public Space
npm run all                   # all three, against CCQ_REPO_PATH as it is
npm run refresh               # latest upstream trunk → scan, build, publish, commit data/ (see below)

npm run track -- pr https://github.com/Automattic/wp-calypso/pull/123 3f9c0d1a2b props-type-name
npm run track -- status claimed 3f9c0d1a2b
npm run track -- status wontfix 3f9c0d1a2b --note "Route test grouping is deliberate"
```

`scan` / `all` read whatever `CCQ_REPO_PATH` has checked out, including a feature branch. For the backlog, prefer `npm run refresh`. Findings link to GitHub at the scanned commit, and `data/history.json` keeps one row per scanned commit.

## Setup

Run `npm install`, then copy `.env.example` to `.env` (gitignored) and fill it in:

```sh
CCQ_REPO_PATH=/path/to/wp-calypso   # checkout to scan
SPACEFAST_TOKEN=sfa_…               # only needed for publishing
SPACEFAST_TEAM=…                    # Spacefast team slug, ID or name
CCQ_WORKTREE_PATH=                  # optional, see Refreshing
```

Real environment variables take precedence over `.env`.

## Refreshing

`npm run refresh` is the hands-off path:

1. `git fetch origin trunk` in `CCQ_REPO_PATH` (remote and branch are in `ccq.config.json`).
2. Checks out `origin/trunk` in a sparse worktree containing only `client/dashboard`, at `CCQ_WORKTREE_PATH` (default `.cache/wp-calypso`, gitignored). It's created on the first run, and your own checkout and branches are left alone.
3. Runs scan, build and publish against that worktree.
4. Commits `data/` in this repo if anything changed. It doesn't push.

Pass `--no-publish` and/or `--no-commit` to skip those steps. Rescanning an unchanged trunk just replaces that commit's history row.

It doesn't run `/discover`, which uses Claude tokens; run that by hand.

### Weekly on macOS with launchd

Save as `~/Library/LaunchAgents/com.ccq.refresh.plist`, replacing the paths. launchd doesn't load your shell profile, so `PATH` must include `node`/`npx` (e.g. your nvm version's `bin`), `git` and `gh`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key><string>com.ccq.refresh</string>
	<key>WorkingDirectory</key><string>/path/to/ccq</string>
	<key>ProgramArguments</key>
	<array>
		<string>/path/to/node</string>
		<string>bin/refresh.mjs</string>
	</array>
	<key>EnvironmentVariables</key>
	<dict>
		<key>PATH</key><string>/path/to/node/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
	</dict>
	<!-- Mondays 09:00. A run missed while asleep happens on wake. -->
	<key>StartCalendarInterval</key>
	<dict>
		<key>Weekday</key><integer>1</integer>
		<key>Hour</key><integer>9</integer>
		<key>Minute</key><integer>0</integer>
	</dict>
	<key>StandardOutPath</key><string>/path/to/ccq/.cache/refresh.log</string>
	<key>StandardErrorPath</key><string>/path/to/ccq/.cache/refresh.log</string>
</dict>
</plist>
```

```sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.ccq.refresh.plist   # enable
launchctl kickstart gui/$(id -u)/com.ccq.refresh                                 # run now to test
launchctl bootout gui/$(id -u)/com.ccq.refresh                                   # disable
```

The fetch uses your git credentials non-interactively, so an SSH remote needs a key that's usable without a prompt (e.g. stored in the macOS keychain). Spacefast API keys expire; when publishing starts failing, put a new `SPACEFAST_TOKEN` in `.env`.

The first `npm run publish` creates a public Space (`ccq-dashboard`) and saves its id in `data/space.json`. Later publishes update it.

## License

[GPL v2 or later](LICENSE), matching wp-calypso.
