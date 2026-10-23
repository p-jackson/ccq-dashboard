import { basename, dirname } from '../lib/context.mjs';

export default {
	id: 'test-file-target',
	title: 'A test file is named after the module it tests',
	category: 'structure',
	status: 'accepted',
	description:
		'`foo/test/bar.test.tsx` tests `foo/bar.tsx` (or `foo/bar/`), and `foo/test/index.test.tsx` tests `foo/index.tsx`. A test whose name matches nothing next to its `test/` folder is hard to find from the code it covers.',
	check( ctx ) {
		const tests = ctx.files.filter( ( f ) => basename( dirname( f ) ) === 'test' && /\.test\.tsx?$/.test( f ) );
		const findings = [];
		for ( const file of tests ) {
			const parent = dirname( dirname( file ) );
			const target = basename( file ).replace( /\.test\.tsx?$/, '' );
			const prefix = parent ? parent + '/' : '';
			const exists =
				[ '.ts', '.tsx' ].some( ( ext ) => ctx.has( prefix + target + ext ) ) ||
				ctx.dirs.includes( prefix + target );
			if ( ! exists ) {
				findings.push( {
					file,
					message: `No \`${ target }.ts(x)\` or \`${ target }/\` beside \`${ prefix }test/\`.`,
					suggestion: 'Rename the test after the module it covers, or move it next to that module.',
				} );
			}
		}
		return { checked: tests.length, findings };
	},
};
