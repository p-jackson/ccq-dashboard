#!/usr/bin/env node
/**
 * Records what's happening with findings, in `data/tracking.json`.
 *
 *   node bin/track.mjs pr <pr-url> <id...>       Link a PR to findings or whole conventions.
 *   node bin/track.mjs status <status> <id...>   Set open | claimed | wontfix (optionally --note "…").
 *   node bin/track.mjs unlink <pr-url>           Forget a PR.
 *
 * Ids are finding ids (from the dashboard) or convention ids.
 */
import { parseArgs } from 'node:util';
import { readJson, writeJson } from '../lib/files.mjs';

const STATUSES = [ 'open', 'claimed', 'wontfix' ];

const { values, positionals } = parseArgs( {
	allowPositionals: true,
	options: { note: { type: 'string' } },
} );
const [ command, target, ...ids ] = positionals;
const tracking = readJson( 'data/tracking.json', { findings: {}, prs: [] } );
const scan = readJson( 'data/findings.json', { findings: [], conventions: [] } );
const known = new Set( [ ...scan.findings.map( ( f ) => f.id ), ...scan.conventions.map( ( c ) => c.id ) ] );

const checkIds = ( list ) => {
	if ( ! list.length ) {
		fail( 'Give at least one finding or convention id.' );
	}
	for ( const id of list.filter( ( i ) => ! known.has( i ) ) ) {
		console.warn( `warning: ${ id } isn’t in the latest scan` );
	}
};

switch ( command ) {
	case 'pr': {
		if ( ! /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/.test( target ?? '' ) ) {
			fail( 'Expected a GitHub pull request URL.' );
		}
		checkIds( ids );
		const pr = tracking.prs.find( ( p ) => p.url === target ) ?? { url: target, ids: [] };
		pr.ids = [ ...new Set( [ ...pr.ids, ...ids ] ) ];
		tracking.prs = [ ...tracking.prs.filter( ( p ) => p.url !== target ), pr ];
		break;
	}
	case 'status': {
		if ( ! STATUSES.includes( target ) ) {
			fail( `Status must be one of: ${ STATUSES.join( ', ' ) }.` );
		}
		checkIds( ids );
		for ( const id of ids ) {
			if ( target === 'open' && ! values.note ) {
				delete tracking.findings[ id ];
			} else {
				tracking.findings[ id ] = { status: target, ...( values.note && { note: values.note } ) };
			}
		}
		break;
	}
	case 'unlink':
		tracking.prs = tracking.prs.filter( ( p ) => p.url !== target );
		break;
	default:
		fail( 'Usage: track pr <url> <id...> | track status <open|claimed|wontfix> <id...> [--note …] | track unlink <url>' );
}

writeJson( 'data/tracking.json', tracking );
console.log( 'Updated data/tracking.json' );

function fail( message ) {
	console.error( message );
	process.exit( 1 );
}
