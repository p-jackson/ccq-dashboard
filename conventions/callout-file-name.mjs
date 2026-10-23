import { basename, dirname } from '../lib/context.mjs';

const CALLOUT = /^(.+)-callout(-illustration)?\.(tsx|svg)$/;

export default {
	id: 'callout-file-name',
	title: 'A feature’s callout is `<folder>-callout.tsx` with `<folder>-callout-illustration.svg`',
	category: 'naming',
	status: 'accepted',
	description:
		'A folder’s illustrated callout is named after the folder (`logs/logs-callout.tsx` + `logs-callout-illustration.svg`). Extra callouts in a folder that already has its own, like `performance/backend-callout.tsx`, are fine. Found by Claude in `sites/`.',
	check( ctx ) {
		const byDir = Map.groupBy(
			ctx.files.filter( ( f ) => CALLOUT.test( basename( f ) ) ),
			dirname
		);
		const findings = [];
		let checked = 0;
		for ( const [ dir, files ] of byDir ) {
			const folder = basename( dir );
			const prefixes = new Set( files.map( ( f ) => basename( f ).match( CALLOUT )[ 1 ] ) );
			// Only illustrated callouts are a folder's "feature callout"; others are ad-hoc notices.
			const illustrated = files.filter( ( f ) => f.endsWith( '-callout-illustration.svg' ) );
			if ( ! illustrated.length || prefixes.has( folder ) ) {
				checked += illustrated.length ? 1 : 0;
				continue;
			}
			checked++;
			const prefix = illustrated[ 0 ].split( '/' ).pop().match( CALLOUT )[ 1 ];
			for ( const file of files.filter( ( f ) => basename( f ).startsWith( prefix + '-' ) ) ) {
				findings.push( {
					file,
					message: `Callout file \`${ basename( file ) }\` doesn’t match its folder \`${ folder }/\`.`,
					suggestion: `Rename to \`${ basename( file ).replace( prefix, folder ) }\` and update its imports.`,
				} );
			}
		}
		return { checked, findings };
	},
};
