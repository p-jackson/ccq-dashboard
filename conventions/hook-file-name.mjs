import { basename, squash, stem, toKebab } from '../lib/context.mjs';
import { getExports } from '../lib/ast.mjs';

const isHookName = ( name ) => /^use[A-Z0-9]/.test( name ?? '' );

export default {
	id: 'hook-file-name',
	title: 'A hook lives in `use-<hook-name>.ts`',
	category: 'naming',
	status: 'proposed',
	description:
		'A module whose only runtime export is a hook is named after it in kebab-case (`useSitePlan` → `use-site-plan.ts`), and a `use-*.ts` file exports the hook its name promises.',
	check( ctx ) {
		const candidates = ctx.files.filter(
			( f ) => ctx.isSource( f ) && ! ctx.isTest( f ) && ! ctx.isStory( f ) && stem( f ) !== 'index'
		);
		const findings = [];
		let checked = 0;
		for ( const file of candidates ) {
			const exports = getExports( ctx, file ).filter( ( e ) => ! e.isTypeOnly && ! e.isReexport );
			const hooks = exports.filter( ( e ) => isHookName( e.name ) );
			const named = stem( file ).startsWith( 'use-' );
			if ( ! named && ! ( hooks.length === 1 && exports.length === 1 ) ) {
				continue;
			}
			checked++;
			const expected = hooks.length === 1 ? toKebab( hooks[ 0 ].name ) : null;
			if ( named && ! hooks.some( ( h ) => squash( h.name ) === squash( stem( file ) ) ) ) {
				findings.push( {
					file,
					message: hooks.length
						? `\`${ basename( file ) }\` exports ${ hooks.map( ( h ) => '`' + h.name + '`' ).join( ', ' ) }, not the hook its name implies.`
						: `\`${ basename( file ) }\` exports no hook.`,
					suggestion: expected ? `Rename to \`${ expected }${ file.slice( file.lastIndexOf( '.' ) ) }\`.` : undefined,
				} );
			} else if ( ! named ) {
				findings.push( {
					file,
					line: ctx.lineOf( file, hooks[ 0 ].node ),
					message: `Only export is \`${ hooks[ 0 ].name }\`, but the file is \`${ basename( file ) }\`.`,
					suggestion: `Rename to \`${ expected }${ file.slice( file.lastIndexOf( '.' ) ) }\`.`,
				} );
			}
		}
		return { checked, findings };
	},
};
