import { basename, dirname, stem } from '../lib/context.mjs';

export default {
	id: 'utils-no-folder-prefix',
	title: 'A folder’s utils module is `utils.ts`, not `<folder>-utils.ts`',
	category: 'naming',
	status: 'accepted',
	description:
		'Per-folder utility modules are plain `utils.ts(x)`. Repeating the folder name (`storage/storage-utils.ts`) adds nothing; topical prefixes that don’t repeat it (`contact-validation-utils.ts`) are fine. Found by Claude in `sites/`.',
	check( ctx ) {
		const candidates = ctx.files.filter( ( f ) => ctx.isSource( f ) && /(^|-)utils$/.test( stem( f ) ) );
		const findings = [];
		for ( const file of candidates ) {
			const folder = basename( dirname( file ) );
			if ( folder && stem( file ) === `${ folder }-utils` ) {
				findings.push( {
					file,
					message: `\`${ basename( file ) }\` repeats its folder name.`,
					suggestion: `Rename to \`${ basename( file ).replace( `${ folder }-`, '' ) }\` and update its imports.`,
				} );
			}
		}
		return { checked: candidates.length, findings };
	},
};
