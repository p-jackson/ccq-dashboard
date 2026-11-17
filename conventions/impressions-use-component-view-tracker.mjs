// Tracks event names for "this came on screen". Page views belong to the router
// (`PageViewTracker`), not to a component.
const IMPRESSION = /_(impression|view|viewed|shown|show|open|opened|display|displayed|seen)$/;
const PAGE_VIEW = /_page_view$/;

const EFFECTS = new Set( [ 'useEffect', 'useLayoutEffect' ] );

// Other helpers that record views, to be folded into the component.
const ALTERNATIVES = {
	useRecordViewOnce:
		'Render `<ComponentViewTracker>` instead. `useRecordViewOnce` records once per page load because the agencies sidebar remounts between sections, so the component needs that option first.',
};

export default {
	id: 'impressions-use-component-view-tracker',
	title: 'Impressions are recorded with `<ComponentViewTracker>`',
	category: 'react',
	status: 'proposed',
	description:
		'An impression records that something came on screen, so it’s rendered with what it tracks: `<ComponentViewTracker eventName="…" />`, not recorded from an effect or another helper. Render the tracker conditionally instead of checking a condition in an effect, and give it a `key` when it should record again as the content changes. Flags impression-named events (`_impression`, `_view`, `_shown`, `_open`, …) recorded in `useEffect` / `useLayoutEffect`, and calls to other view helpers. Checked counts those plus every `<ComponentViewTracker>`.',
	check( ctx ) {
		const { ts } = ctx;
		const candidates = ctx.files.filter(
			( f ) =>
				ctx.isSource( f ) &&
				! ctx.isTest( f ) &&
				! ctx.isStory( f ) &&
				/ComponentViewTracker|record\w*Event|useRecordViewOnce/.test( ctx.read( f ) )
		);
		const findings = [];
		let checked = 0;
		for ( const file of candidates ) {
			const seen = new Map();
			const add = ( node, base, finding ) => {
				const n = ( seen.get( base ) ?? 0 ) + 1;
				seen.set( base, n );
				findings.push( { file, line: ctx.lineOf( file, node ), key: n > 1 ? `${ base } #${ n }` : base, ...finding } );
			};
			const visit = ( node ) => {
				if (
					( ts.isJsxSelfClosingElement( node ) || ts.isJsxOpeningElement( node ) ) &&
					node.tagName.getText() === 'ComponentViewTracker'
				) {
					checked++;
				}
				if ( ts.isCallExpression( node ) ) {
					const name = calleeName( ts, node.expression );
					if ( EFFECTS.has( name ) && node.arguments[ 0 ] ) {
						for ( const call of impressionCalls( ts, node.arguments[ 0 ] ) ) {
							checked++;
							const event = call.arguments[ 0 ].text;
							add( call, event, {
								message: `Records \`${ event }\` from an effect.`,
								suggestion: `Render \`<ComponentViewTracker eventName="${ event }" />\` with the UI it tracks.`,
							} );
						}
					} else if ( Object.hasOwn( ALTERNATIVES, name ) ) {
						checked++;
						add( node, `${ name }( ${ node.arguments[ 0 ]?.getText() ?? '' } )`, {
							message: `Records a view with \`${ name }\`.`,
							suggestion: ALTERNATIVES[ name ],
						} );
					}
				}
				ts.forEachChild( node, visit );
			};
			visit( ctx.ast( file ) );
		}
		return { checked, findings };
	},
};

/** `recordTracksEvent( 'x_impression', … )`-style calls with a literal impression event name. */
function impressionCalls( ts, root ) {
	const calls = [];
	const visit = ( node ) => {
		if ( ts.isCallExpression( node ) && /^record\w*Event$/.test( calleeName( ts, node.expression ) ?? '' ) ) {
			const event = node.arguments[ 0 ];
			if ( event && ts.isStringLiteralLike( event ) && IMPRESSION.test( event.text ) && ! PAGE_VIEW.test( event.text ) ) {
				calls.push( node );
			}
		}
		ts.forEachChild( node, visit );
	};
	visit( root );
	return calls;
}

function calleeName( ts, callee ) {
	if ( ts.isIdentifier( callee ) ) {
		return callee.text;
	}
	return ts.isPropertyAccessExpression( callee ) ? callee.name.text : null;
}
