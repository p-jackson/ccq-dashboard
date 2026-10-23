#!/usr/bin/env node
/**
 * Assembles `dist/`: the static dashboard plus one `data.json` combining the
 * latest scan, run history, tracking and live PR state from `gh`.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { fromRoot, readJson, writeJson } from '../lib/files.mjs';

const scan = readJson( 'data/findings.json' );
if ( ! scan ) {
	console.error( 'No data/findings.json yet. Run `npm run scan` first.' );
	process.exit( 1 );
}
const tracking = readJson( 'data/tracking.json', { findings: {}, prs: [] } );

const prs = tracking.prs.map( ( pr ) => ( { ...pr, ...prDetails( pr.url ) } ) );

rmSync( fromRoot( 'dist' ), { recursive: true, force: true } );
cpSync( fromRoot( 'site' ), fromRoot( 'dist' ), { recursive: true } );
writeJson( 'dist/data.json', {
	...scan,
	builtAt: new Date().toISOString(),
	history: readJson( 'data/history.json', [] ),
	tracking: tracking.findings,
	prs,
} );
console.log( `Built dist/ (${ scan.findings.length } findings, ${ prs.length } PRs)` );

function prDetails( url ) {
	try {
		const out = execFileSync( 'gh', [ 'pr', 'view', url, '--json', 'number,title,state,author,updatedAt' ], {
			encoding: 'utf8',
			stdio: [ 'ignore', 'pipe', 'ignore' ],
		} );
		const { author, ...rest } = JSON.parse( out );
		return { ...rest, author: author?.login };
	} catch {
		console.warn( `warning: couldn’t fetch ${ url } with gh; showing it without details` );
		return { number: Number( url.split( '/' ).pop() ), title: null, state: 'UNKNOWN' };
	}
}
