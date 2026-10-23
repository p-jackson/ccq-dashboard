import { basename } from '../lib/context.mjs';
import { containsJsx } from '../lib/ast.mjs';

export default {
	id: 'tsx-only-with-jsx',
	title: '`.tsx` only for files that contain JSX',
	category: 'naming',
	status: 'accepted',
	description:
		'Files without JSX use the `.ts` extension, so the extension tells you whether a module renders anything.',
	check( ctx ) {
		const candidates = ctx.files.filter( ( f ) => f.endsWith( '.tsx' ) && ! ctx.isStory( f ) );
		const findings = [];
		for ( const file of candidates ) {
			if ( ! containsJsx( ctx, file ) ) {
				findings.push( {
					file,
					message: `\`${ basename( file ) }\` has no JSX.`,
					suggestion: `Rename to \`${ basename( file ).replace( /\.tsx$/, '.ts' ) }\`.`,
				} );
			}
		}
		return { checked: candidates.length, findings };
	},
};
