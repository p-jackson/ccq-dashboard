import tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import plugin from 'eslint-plugin-react-you-might-not-need-an-effect';

const PREFIX = 'react-you-might-not-need-an-effect/';

// Each plugin rule maps to a section of https://react.dev/learn/you-might-not-need-an-effect.
// `no-initialize-state` is left out: it targets SSR hydration, and the dashboard renders
// client-side only, so it flags legitimate observer and measurement effects.
const PATTERNS = {
	'no-derived-state': 'stores derived state',
	'no-chain-state-updates': 'chains state updates',
	'no-event-handler': 'acts as an event handler',
	'no-adjust-state-on-prop-change': 'adjusts state when a prop changes',
	'no-reset-all-state-on-prop-change': 'resets all state when a prop changes',
	'no-pass-live-state-to-parent': 'passes live state to a parent',
	'no-pass-data-to-parent': 'passes data to a parent',
	'no-external-store-subscription': 'subscribes to an external store',
};
const RULES = Object.keys( PATTERNS );

// The plugin runs through ESLint's synchronous `Linter`, so the scan needs nothing
// from wp-calypso's node_modules or ESLint config.
const linter = new Linter( { configType: 'flat' } );
const config = [
	{
		files: [ '**/*.ts', '**/*.tsx' ],
		languageOptions: {
			parser: tsParser,
			parserOptions: { ecmaFeatures: { jsx: true } },
		},
		// Inline `eslint-disable` comments were written for wp-calypso's own rules,
		// so ignore them; deliberate exceptions are tracked as `wontfix` instead.
		linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'off' },
		plugins: { 'react-you-might-not-need-an-effect': plugin },
		rules: Object.fromEntries( RULES.map( ( rule ) => [ PREFIX + rule, 'error' ] ) ),
	},
];

export default {
	id: 'you-might-not-need-an-effect',
	title: '`useEffect` only syncs with external systems',
	category: 'react',
	status: 'proposed',
	description:
		'Effects don’t derive state, chain state updates, stand in for event handlers, adjust or reset state when props change, pass state or data up to a parent, or subscribe to external stores; see [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect). Checked with [eslint-plugin-react-you-might-not-need-an-effect](https://github.com/nickjvandyke/eslint-plugin-react-you-might-not-need-an-effect); one finding per effect.',
	check( ctx ) {
		const candidates = ctx.files.filter(
			( f ) => ctx.isSource( f ) && ! ctx.isTest( f ) && ! ctx.isStory( f ) && /\buseEffect\b/.test( ctx.read( f ) )
		);
		const findings = [];
		let checked = 0;
		for ( const file of candidates ) {
			const messages = linter.verify( ctx.read( file ), config, { filename: file } );
			const fatal = messages.find( ( m ) => m.fatal );
			if ( fatal ) {
				console.warn( `warning: skipped ${ file }:${ fatal.line }: ${ fatal.message }` );
				continue;
			}
			const effects = findEffects( ctx, file );
			checked += effects.length;
			const sf = ctx.ast( file );
			const loose = new Map();
			for ( const m of messages.filter( ( x ) => x.ruleId?.startsWith( PREFIX ) ) ) {
				const report = { rule: m.ruleId.slice( PREFIX.length ), message: m.message };
				// Group by the innermost effect around the report.
				const pos = sf.getPositionOfLineAndCharacter( m.line - 1, m.column - 1 );
				const effect = effects
					.filter( ( e ) => e.node.getStart() <= pos && pos < e.node.end )
					.sort( ( a, b ) => a.node.end - a.node.getStart() - ( b.node.end - b.node.getStart() ) )[ 0 ];
				if ( effect ) {
					effect.reports.push( report );
				} else {
					// `useEffect( fn )` with `fn` defined elsewhere: report it where the plugin did.
					const key = `${ report.rule }: ${ report.message }`;
					loose.set( key, { line: m.line, key, reports: [ report ] } );
				}
			}
			for ( const effect of [ ...effects.filter( ( e ) => e.reports.length ), ...loose.values() ] ) {
				findings.push( {
					file,
					line: effect.line ?? ctx.lineOf( file, effect.node ),
					key: effect.key,
					...describe( effect.reports ),
				} );
			}
		}
		return { checked, findings };
	},
};

/**
 * Every `useEffect( … )` / `React.useEffect( … )` call in the file, with a key that
 * survives line shifts: the enclosing component or hook plus the dependency array.
 */
function findEffects( ctx, file ) {
	const { ts } = ctx;
	const effects = [];
	const seen = new Map();
	const visit = ( node ) => {
		if ( ts.isCallExpression( node ) && calleeName( ts, node.expression ) === 'useEffect' ) {
			const deps = depsText( ts, node.arguments[ 1 ] );
			const base = `${ ownerName( ts, node ) ?? '(anonymous)' }: useEffect( ${ deps } )`;
			const n = ( seen.get( base ) ?? 0 ) + 1;
			seen.set( base, n );
			effects.push( { node, key: n > 1 ? `${ base } #${ n }` : base, reports: [] } );
		}
		ts.forEachChild( node, visit );
	};
	visit( ctx.ast( file ) );
	return effects;
}

// Rebuilt from the elements so reformatting (wrapping, trailing commas) keeps the key.
function depsText( ts, deps ) {
	if ( ! deps ) {
		return 'no deps';
	}
	const squeeze = ( node ) => node.getText().replace( /\s+/g, ' ' );
	if ( ! ts.isArrayLiteralExpression( deps ) ) {
		return squeeze( deps );
	}
	return deps.elements.length ? `[ ${ deps.elements.map( squeeze ).join( ', ' ) } ]` : '[]';
}

function calleeName( ts, callee ) {
	if ( ts.isIdentifier( callee ) ) {
		return callee.text;
	}
	return ts.isPropertyAccessExpression( callee ) ? callee.name.text : null;
}

/** The nearest named function or variable around a hook call: its component or hook. */
function ownerName( ts, node ) {
	for ( let n = node.parent; n; n = n.parent ) {
		if ( ( ts.isFunctionDeclaration( n ) || ts.isMethodDeclaration( n ) ) && n.name ) {
			return n.name.getText();
		}
		if ( ts.isVariableDeclaration( n ) && ts.isIdentifier( n.name ) ) {
			return n.name.text;
		}
	}
	return null;
}

/**
 * Turns the plugin's reports for one effect into a message naming each pattern
 * (linked to its react.dev section) and a suggestion built from the plugin's own
 * "Instead, …" advice.
 */
function describe( reports ) {
	const rules = RULES.filter( ( rule ) => reports.some( ( r ) => r.rule === rule ) );
	const patterns = rules.map( ( rule ) => `[${ PATTERNS[ rule ] }](${ plugin.rules[ rule ].meta.docs.url })` );
	const fixes = new Set();
	for ( const rule of rules ) {
		for ( const r of reports.filter( ( x ) => x.rule === rule ) ) {
			const fix = adviceOf( r.message );
			if ( fix ) {
				fixes.add( fix );
			}
		}
	}
	return {
		message: `Effect ${ listFormat.format( patterns ) }.`,
		suggestion: [ ...fixes ].join( ' ' ),
	};
}

const listFormat = new Intl.ListFormat( 'en', { type: 'conjunction' } );

// "Avoid storing derived state. Instead, compute "x" directly during render."
// → "Compute `x` directly during render."
function adviceOf( message ) {
	const rest = message.match( /^.*?\.\s+(.*)$/ )?.[ 1 ];
	if ( ! rest ) {
		return null;
	}
	const advice = rest
		.replace( /^Instead,\s*/, '' )
		.replace( /"([^"\s]+)"/g, '`$1`' )
		// The plugin can repeat names: "`a` and `b` and `a`".
		.replace( /`[^`]+`(?: and `[^`]+`)+/g, ( run ) => [ ...new Set( run.split( ' and ' ) ) ].join( ' and ' ) );
	return advice[ 0 ].toUpperCase() + advice.slice( 1 );
}
