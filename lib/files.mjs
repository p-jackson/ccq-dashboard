import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );

export const fromRoot = ( ...parts ) => path.join( ROOT, ...parts );

export function readJson( rel, fallback ) {
	const file = fromRoot( rel );
	return existsSync( file ) ? JSON.parse( readFileSync( file, 'utf8' ) ) : fallback;
}

export function writeJson( rel, value ) {
	const file = fromRoot( rel );
	mkdirSync( path.dirname( file ), { recursive: true } );
	writeFileSync( file, JSON.stringify( value, null, '\t' ) + '\n' );
}

/**
 * `ccq.config.json` holds shareable settings; machine-specific ones come from
 * the environment (or a gitignored `.env`), e.g. `CCQ_REPO_PATH`.
 */
export function loadConfig() {
	if ( existsSync( fromRoot( '.env' ) ) ) {
		process.loadEnvFile( fromRoot( '.env' ) );
	}
	if ( ! process.env.CCQ_REPO_PATH ) {
		console.error( 'Set CCQ_REPO_PATH to your wp-calypso checkout, in .env or the environment (see README).' );
		process.exit( 1 );
	}
	return { ...readJson( 'ccq.config.json' ), repoPath: process.env.CCQ_REPO_PATH };
}
