import { basename } from '../lib/context.mjs';

const ALT = /^(helpers?|util)$/;

export default {
	id: 'utils-not-helpers',
	title: 'Shared functions go in `utils`, not `helpers`',
	category: 'naming',
	status: 'accepted',
	description:
		'Grab-bag modules are called `utils.ts` or `utils/` (17 files, 6 folders today) rather than `helpers`, `helper` or `util`.',
	check( ctx ) {
		const findings = [];
		let checked = 0;
		for ( const dir of ctx.dirs ) {
			const name = basename( dir );
			if ( name === 'utils' || ALT.test( name ) ) {
				checked++;
				if ( ALT.test( name ) ) {
					findings.push( { file: dir + '/', message: `Folder \`${ name }/\`.`, suggestion: 'Rename to `utils/`.' } );
				}
			}
		}
		for ( const file of ctx.files.filter( ctx.isSource ) ) {
			const s = basename( file ).replace( /\..*$/, '' );
			if ( s === 'utils' || ALT.test( s ) ) {
				checked++;
				if ( ALT.test( s ) ) {
					findings.push( { file, message: `File \`${ basename( file ) }\`.`, suggestion: 'Rename to `utils.ts`.' } );
				}
			}
		}
		return { checked, findings };
	},
};
