#!/usr/bin/env node
/**
 * Unattended scan of the latest upstream trunk: fetches it into a sparse
 * worktree that only ccq uses, then scans, builds, publishes and commits the
 * updated `data/`. Your own wp-calypso checkout is never changed (beyond the fetch).
 *
 *   node bin/refresh.mjs [--no-publish] [--no-commit]
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { fromRoot, loadConfig } from '../lib/files.mjs';

const { values: args } = parseArgs( {
	options: {
		'no-publish': { type: 'boolean', default: false },
		'no-commit': { type: 'boolean', default: false },
	},
} );

const config = loadConfig();
const { remote = 'origin', branch = 'trunk' } = config;
const upstream = `${ remote }/${ branch }`;
const worktree = process.env.CCQ_WORKTREE_PATH || fromRoot( '.cache', 'wp-calypso' );

const run = ( cmd, cmdArgs, opts = {} ) =>
	execFileSync( cmd, cmdArgs, { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'inherit' ], ...opts } );
const git = ( dir, ...gitArgs ) => run( 'git', [ '-C', dir, ...gitArgs ] ).trim();
const step = ( message ) => console.log( `\n▸ ${ message }` );

step( `Fetching ${ upstream }` );
git( config.repoPath, 'fetch', '--quiet', remote, branch );

if ( ! existsSync( worktree ) ) {
	step( `Creating sparse worktree at ${ worktree }` );
	git( config.repoPath, 'worktree', 'add', '--quiet', '--detach', '--no-checkout', worktree, upstream );
	git( worktree, 'sparse-checkout', 'set', '--cone', config.root );
}
git( worktree, 'checkout', '--quiet', '--force', '--detach', upstream );
const commit = git( worktree, 'rev-parse', 'HEAD' );
console.log( `  at ${ commit.slice( 0, 10 ) }` );

// Each script calls loadConfig(); a real env var wins over .env.
const env = { ...process.env, CCQ_REPO_PATH: worktree };
const script = ( name ) => run( process.execPath, [ fromRoot( 'bin', `${ name }.mjs` ) ], { env, stdio: 'inherit' } );

step( 'Scanning' );
script( 'scan' );
step( 'Building' );
script( 'build' );
if ( ! args[ 'no-publish' ] ) {
	step( 'Publishing' );
	script( 'publish' );
}

if ( ! args[ 'no-commit' ] ) {
	const ccq = fromRoot();
	git( ccq, 'add', 'data' );
	if ( git( ccq, 'status', '--porcelain', 'data' ) ) {
		step( 'Committing data/' );
		// Pathspec keeps anything else you have staged out of this commit.
		git( ccq, 'commit', '--quiet', '-m', `Refresh scan at ${ config.githubRepo }@${ commit.slice( 0, 10 ) }`, '--', 'data' );
	} else {
		step( 'No changes to commit' );
	}
}
