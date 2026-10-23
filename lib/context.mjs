import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Builds the read-only view of the target repo that every convention's
 * `check()` receives. Only git-tracked files are visible, so build output and
 * untracked scratch files never produce findings.
 */
export function createContext( { repoPath, root } ) {
	const git = ( ...args ) =>
		execFileSync( 'git', [ '-C', repoPath, ...args ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 } );

	const commit = git( 'rev-parse', 'HEAD' ).trim();
	const files = git( 'ls-files', '--', root )
		.split( '\n' )
		.filter( Boolean )
		.map( ( f ) => path.posix.relative( root, f ) )
		.sort();
	const dirs = [ ...new Set( files.flatMap( ancestorDirs ) ) ].sort();
	const fileSet = new Set( files );

	// Parse with the target repo's own TypeScript so syntax support matches it.
	const ts = createRequire( path.join( repoPath, 'package.json' ) )( 'typescript' );

	const sources = new Map();
	const asts = new Map();

	const read = ( file ) => {
		if ( ! sources.has( file ) ) {
			sources.set( file, readFileSync( path.join( repoPath, root, file ), 'utf8' ) );
		}
		return sources.get( file );
	};

	const ast = ( file ) => {
		if ( ! asts.has( file ) ) {
			const kind = file.endsWith( 'x' ) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
			asts.set( file, ts.createSourceFile( file, read( file ), ts.ScriptTarget.Latest, true, kind ) );
		}
		return asts.get( file );
	};

	const lineOf = ( file, node ) => ast( file ).getLineAndCharacterOfPosition( node.getStart() ).line + 1;

	return {
		commit,
		files,
		dirs,
		has: ( file ) => fileSet.has( file ),
		read,
		ast,
		lineOf,
		ts,
		isSource: ( file ) => /\.(ts|tsx)$/.test( file ) && ! file.endsWith( '.d.ts' ),
		isTest: ( file ) => file.split( '/' ).includes( 'test' ),
		isStory: ( file ) => /\.stories\.(ts|tsx)$/.test( file ),
	};
}

function ancestorDirs( file ) {
	const parts = file.split( '/' ).slice( 0, -1 );
	return parts.map( ( _, i ) => parts.slice( 0, i + 1 ).join( '/' ) );
}

export const basename = ( file ) => file.split( '/' ).pop();
export const dirname = ( file ) => file.split( '/' ).slice( 0, -1 ).join( '/' );
export const stem = ( file ) => basename( file ).replace( /\..*$/, '' );
export const toKebab = ( name ) =>
	name
		.replace( /([a-z0-9])([A-Z])/g, '$1-$2' )
		.replace( /([A-Z]+)([A-Z][a-z])/g, '$1-$2' )
		.toLowerCase();

/** Compares names ignoring case and word breaks, so `WooPayments` ≈ `woopayments`. */
export const squash = ( name ) => name.replace( /[-_]/g, '' ).toLowerCase();
