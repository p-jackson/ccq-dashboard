/**
 * Small helpers over the TypeScript AST. Kept deliberately shallow: conventions
 * should read like "what does this file export", not like compiler passes.
 */

const hasModifier = ( ts, node, kind ) => !! node.modifiers?.some( ( m ) => m.kind === kind );

/**
 * Lists a file's top-level exports as `{ name, isDefault, node, isFunctionLike }`.
 * `name` is the local binding name, so `export default function Foo()` is `Foo`
 * and an anonymous default export is `null`.
 */
export function getExports( ctx, file ) {
	const { ts } = ctx;
	const sf = ctx.ast( file );
	const out = [];

	for ( const stmt of sf.statements ) {
		const exported = hasModifier( ts, stmt, ts.SyntaxKind.ExportKeyword );
		const isDefault = hasModifier( ts, stmt, ts.SyntaxKind.DefaultKeyword );

		if ( exported && ( ts.isFunctionDeclaration( stmt ) || ts.isClassDeclaration( stmt ) ) ) {
			out.push( { name: stmt.name?.text ?? null, isDefault, node: stmt, isFunctionLike: true } );
		} else if ( exported && ts.isVariableStatement( stmt ) ) {
			for ( const decl of stmt.declarationList.declarations ) {
				if ( ts.isIdentifier( decl.name ) ) {
					out.push( {
						name: decl.name.text,
						isDefault: false,
						node: decl,
						isFunctionLike: isFunctionInit( ts, decl.initializer ),
					} );
				}
			}
		} else if ( ts.isExportAssignment( stmt ) && ! stmt.isExportEquals ) {
			const expr = stmt.expression;
			out.push( {
				name: ts.isIdentifier( expr ) ? expr.text : wrappedIdentifier( ts, expr ),
				isDefault: true,
				node: stmt,
				isFunctionLike: true,
			} );
		} else if ( ts.isExportDeclaration( stmt ) && stmt.exportClause && ts.isNamedExports( stmt.exportClause ) ) {
			for ( const spec of stmt.exportClause.elements ) {
				out.push( {
					name: spec.name.text,
					isDefault: spec.name.text === 'default',
					node: spec,
					isFunctionLike: false,
					isReexport: !! stmt.moduleSpecifier,
					isTypeOnly: stmt.isTypeOnly || spec.isTypeOnly,
				} );
			}
		}
	}
	return out;
}

/** True when the file contains any JSX element, fragment or self-closing tag. */
export function containsJsx( ctx, file ) {
	const { ts } = ctx;
	let found = false;
	const visit = ( node ) => {
		if ( found ) {
			return;
		}
		if ( ts.isJsxElement( node ) || ts.isJsxSelfClosingElement( node ) || ts.isJsxFragment( node ) ) {
			found = true;
			return;
		}
		ts.forEachChild( node, visit );
	};
	visit( ctx.ast( file ) );
	return found;
}

/** The function node behind an export, unwrapping `const X = () => …`. */
export function exportedFunction( ctx, exp ) {
	const { ts } = ctx;
	if ( ts.isFunctionDeclaration( exp.node ) ) {
		return exp.node;
	}
	if ( ts.isVariableDeclaration( exp.node ) && isFunctionInit( ts, exp.node.initializer ) ) {
		return exp.node.initializer;
	}
	return null;
}

function isFunctionInit( ts, init ) {
	return !! init && ( ts.isArrowFunction( init ) || ts.isFunctionExpression( init ) );
}

// `export default memo( Foo )` / `forwardRef( Foo )` → `Foo`.
function wrappedIdentifier( ts, expr ) {
	if ( ts.isCallExpression( expr ) && expr.arguments.length === 1 && ts.isIdentifier( expr.arguments[ 0 ] ) ) {
		return expr.arguments[ 0 ].text;
	}
	return null;
}
