#!/usr/bin/env node
/**
 * Runs every convention in `conventions/` against the target repo and writes
 * `data/findings.json`, plus one row per commit in `data/history.json`.
 *
 *   node bin/scan.mjs [--only <convention-id>]
 */
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { createContext } from '../lib/context.mjs';
import { loadConfig, readJson, writeJson, fromRoot } from '../lib/files.mjs';

const { values: args } = parseArgs( { options: { only: { type: 'string' } } } );
const config = loadConfig();
const ctx = createContext( { repoPath: config.repoPath, root: config.root } );

const conventions = [];
for ( const file of readdirSync( fromRoot( 'conventions' ) ).filter( ( f ) => f.endsWith( '.mjs' ) ).sort() ) {
	const { default: convention } = await import( fromRoot( 'conventions', file ) );
	if ( ! args.only || args.only === convention.id ) {
		conventions.push( convention );
	}
}

const results = [];
const findings = [];
for ( const convention of conventions ) {
	const started = performance.now();
	const { checked, findings: raw } = convention.check( ctx );
	for ( const f of raw ) {
		findings.push( {
			id: findingId( convention.id, f ),
			convention: convention.id,
			source: 'scan',
			...f,
		} );
	}
	const { check, ...meta } = convention;
	results.push( { ...meta, checked, violations: raw.length } );
	console.log(
		`${ String( raw.length ).padStart( 4 ) } / ${ String( checked ).padEnd( 5 ) } ${ convention.id }  (${ Math.round( performance.now() - started ) }ms)`
	);
}

// Claude-proposed conventions and findings, written by the /discover command.
const discovered = readJson( 'data/discovered.json', { conventions: [], findings: [] } );
for ( const c of discovered.conventions ) {
	if ( ! results.some( ( r ) => r.id === c.id ) ) {
		const count = discovered.findings.filter( ( f ) => f.convention === c.id ).length;
		results.push( { status: 'proposed', ...c, source: 'claude', checked: null, violations: count } );
	}
}
for ( const f of discovered.findings ) {
	findings.push( { id: findingId( f.convention, f ), source: 'claude', ...f } );
}

const scan = {
	generatedAt: new Date().toISOString(),
	commit: ctx.commit,
	githubRepo: config.githubRepo,
	root: config.root,
	fileCount: ctx.files.length,
	conventions: results,
	findings,
};
writeJson( 'data/findings.json', scan );

if ( ! args.only ) {
	const history = readJson( 'data/history.json', [] ).filter( ( h ) => h.commit !== ctx.commit );
	history.push( {
		date: scan.generatedAt,
		commit: ctx.commit,
		counts: Object.fromEntries( results.map( ( r ) => [ r.id, r.violations ] ) ),
	} );
	writeJson( 'data/history.json', history );
}

console.log( `\n${ findings.length } findings across ${ ctx.files.length } files at ${ ctx.commit.slice( 0, 10 ) }` );

// Stable across runs so tracking (status, PR links) survives rescans.
function findingId( conventionId, f ) {
	return createHash( 'sha1' )
		.update( [ conventionId, f.file, f.key ?? f.message ].join( '\0' ) )
		.digest( 'hex' )
		.slice( 0, 10 );
}
