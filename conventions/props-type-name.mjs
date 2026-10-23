import { getExports, exportedFunction } from '../lib/ast.mjs';

export default {
	id: 'props-type-name',
	title: 'Component props types are `<Component>Props`',
	category: 'naming',
	status: 'accepted',
	description:
		'An exported component whose props use a named type calls that type `<ComponentName>Props`. Inline object types are left alone.',
	check( ctx ) {
		const { ts } = ctx;
		const candidates = ctx.files.filter( ( f ) => f.endsWith( '.tsx' ) && ! ctx.isTest( f ) && ! ctx.isStory( f ) );
		const findings = [];
		let checked = 0;
		for ( const file of candidates ) {
			for ( const exp of getExports( ctx, file ) ) {
				if ( ! /^[A-Z]/.test( exp.name ?? '' ) ) {
					continue;
				}
				const fn = exportedFunction( ctx, exp );
				const type = fn?.parameters[ 0 ]?.type;
				if ( ! type || ! ts.isTypeReferenceNode( type ) || ! ts.isIdentifier( type.typeName ) ) {
					continue;
				}
				checked++;
				const actual = type.typeName.text;
				const expected = `${ exp.name }Props`;
				if ( actual !== expected ) {
					findings.push( {
						file,
						line: ctx.lineOf( file, type ),
						message: `\`${ exp.name }\` takes \`${ actual }\`.`,
						suggestion: `Rename the type to \`${ expected }\`.`,
					} );
				}
			}
		}
		return { checked, findings };
	},
};
