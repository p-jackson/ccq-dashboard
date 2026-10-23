import { basename, dirname } from '../lib/context.mjs';

// Sass partials (`_foo.scss`), CSS modules and story-only styles follow their own naming.
const isPlainStylesheet = ( file ) =>
	file.endsWith( '.scss' ) && ! /^_|\.module\.scss$|\.stories\.scss$/.test( basename( file ) );

export default {
	id: 'stylesheet-name',
	title: 'A folder’s stylesheet is `style.scss`',
	category: 'naming',
	status: 'accepted',
	description:
		'When a folder has a single plain stylesheet, it is called `style.scss` (the name used by ~100 folders), not `styles.scss`, `index.scss` or `<component>.scss`.',
	check( ctx ) {
		const byDir = Map.groupBy( ctx.files.filter( isPlainStylesheet ), dirname );
		const findings = [];
		for ( const [ dir, sheets ] of byDir ) {
			if ( sheets.length === 1 && basename( sheets[ 0 ] ) !== 'style.scss' ) {
				findings.push( {
					file: sheets[ 0 ],
					message: `Only stylesheet in \`${ dir || '.' }/\` is named \`${ basename( sheets[ 0 ] ) }\`.`,
					suggestion: 'Rename to `style.scss` and update its import.',
				} );
			}
		}
		return { checked: byDir.size, findings };
	},
};
