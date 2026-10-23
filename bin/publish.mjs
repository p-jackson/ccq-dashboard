#!/usr/bin/env node
/**
 * Publishes `dist/` to Spacefast. The first run creates a public Space and
 * records its id in `data/space.json`; later runs republish to that Space.
 *
 * Needs SPACEFAST_TOKEN and SPACEFAST_TEAM, read from `.env` or the environment.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fromRoot, loadConfig, readJson, writeJson } from '../lib/files.mjs';

const config = loadConfig();
if ( ! process.env.SPACEFAST_TOKEN ) {
	console.error( 'Set SPACEFAST_TOKEN in .env (see README).' );
	process.exit( 1 );
}
if ( ! existsSync( fromRoot( 'dist', 'data.json' ) ) ) {
	console.error( 'No dist/ yet. Run `npm run build` first.' );
	process.exit( 1 );
}

const space = readJson( 'data/space.json', null );
const { commit } = readJson( 'data/findings.json' );

const args = [ '-y', 'spacefast@latest', 'publish', fromRoot( 'dist' ), '--json', '--wait' ];
args.push( '--message', `Scan of ${ config.githubRepo }@${ commit.slice( 0, 10 ) }` );
if ( space ) {
	args.push( '--space', space.id );
} else {
	args.push( '--name', config.space.name, '--slug', config.space.slug, '--access', 'public' );
}

const out = execFileSync( 'npx', args, { encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'inherit' ] } );
// With --json the receipt is the last JSON line.
const receipt = JSON.parse( out.trim().split( '\n' ).filter( ( l ) => l.startsWith( '{' ) ).pop() );
const { id, liveUrl } = receipt.data?.space ?? {};

if ( ! space && id ) {
	writeJson( 'data/space.json', { id, liveUrl } );
}
console.log( `Published: ${ liveUrl ?? space?.liveUrl ?? '(URL pending, see receipt)' }` );
if ( ! liveUrl && receipt.next ) {
	console.log( JSON.stringify( receipt.next, null, 2 ) );
}
