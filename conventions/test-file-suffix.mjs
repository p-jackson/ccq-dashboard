import { basename } from '../lib/context.mjs';

const TEST_CALL = /^\s*(describe|it|test)(\.each)?\s*\(/m;

export default {
	id: 'test-file-suffix',
	title: 'Test files end in `.test.ts(x)`',
	category: 'naming',
	status: 'accepted',
	description:
		'A file in a `test/` folder that contains `describe`/`it`/`test` blocks is named `*.test.ts` or `*.test.tsx`. Unsuffixed files in `test/` are then reserved for fixtures and helpers.',
	check( ctx ) {
		const candidates = ctx.files.filter( ( f ) => ctx.isTest( f ) && ctx.isSource( f ) );
		const findings = [];
		for ( const file of candidates ) {
			if ( ! /\.test\.tsx?$/.test( file ) && TEST_CALL.test( ctx.read( file ) ) ) {
				findings.push( {
					file,
					message: `\`${ basename( file ) }\` contains tests but has no \`.test\` suffix.`,
					suggestion: `Rename to \`${ basename( file ).replace( /\.(tsx?)$/, '.test.$1' ) }\`.`,
				} );
			}
		}
		return { checked: candidates.length, findings };
	},
};
