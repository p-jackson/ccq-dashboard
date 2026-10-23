import { basename, dirname } from '../lib/context.mjs';

const UPSELL = /^upsell-illustration(-.+)?\.(svg|tsx)$/;

export default {
	id: 'upsell-illustration-name',
	title: 'An upsell illustration is `upsell-illustration.svg`',
	category: 'naming',
	status: 'accepted',
	description:
		'A folder with one upsell image calls it plain `upsell-illustration.svg` (or `.tsx`); the folder already says what it’s for. Found by Claude in `sites/`.',
	check( ctx ) {
		const byDir = Map.groupBy(
			ctx.files.filter( ( f ) => UPSELL.test( basename( f ) ) ),
			dirname
		);
		const findings = [];
		for ( const files of byDir.values() ) {
			const [ file ] = files;
			const [ , suffix, ext ] = basename( file ).match( UPSELL );
			// Several illustrations in one folder need suffixes to tell them apart.
			if ( files.length === 1 && suffix ) {
				findings.push( {
					file,
					message: `Upsell image has a \`${ suffix }\` suffix.`,
					suggestion: `Rename to \`upsell-illustration.${ ext }\` and update its import.`,
				} );
			}
		}
		return { checked: byDir.size, findings };
	},
};
