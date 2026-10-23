const $ = ( id ) => document.getElementById( id );
const el = ( tag, props = {}, ...children ) => {
	const node = Object.assign( document.createElement( tag ), props );
	node.append( ...children.flat().filter( ( c ) => c !== null && c !== undefined && c !== false ) );
	return node;
};
const fmt = new Intl.NumberFormat();

const data = await ( await fetch( 'data.json', { cache: 'no-cache' } ) ).json();
const conventions = [ ...data.conventions ].sort(
	( a, b ) => ( b.status === 'accepted' ) - ( a.status === 'accepted' ) || b.violations - a.violations
);
const byId = new Map( conventions.map( ( c ) => [ c.id, c ] ) );

// PRs can point at individual findings or at a whole convention.
const prsFor = ( finding ) => data.prs.filter( ( p ) => p.ids.includes( finding.id ) || p.ids.includes( finding.convention ) );
const statusOf = ( finding ) => data.tracking[ finding.id ]?.status ?? ( prsFor( finding ).length ? 'pr' : 'open' );
const areaOf = ( finding ) => ( finding.file.includes( '/' ) ? finding.file.split( '/' )[ 0 ] : '(root)' );

const state = {
	convention: decodeURIComponent( location.hash.slice( 1 ) ) || null,
	q: '',
	area: '',
	status: 'active',
};

renderHeader();
renderAreaOptions();
renderPrs();
render();

$( 'q' ).addEventListener( 'input', ( e ) => {
	state.q = e.target.value.trim().toLowerCase();
	renderFindings();
} );
$( 'area' ).addEventListener( 'change', ( e ) => {
	state.area = e.target.value;
	render();
} );
$( 'status' ).addEventListener( 'change', ( e ) => {
	state.status = e.target.value;
	render();
} );
window.addEventListener( 'hashchange', () => {
	state.convention = decodeURIComponent( location.hash.slice( 1 ) ) || null;
	render();
} );

function render() {
	renderConventions();
	renderDetail();
	renderFindings();
}

function renderHeader() {
	const commitUrl = `https://github.com/${ data.githubRepo }/tree/${ data.commit }/${ data.root }`;
	$( 'root' ).textContent = data.root;
	$( 'meta' ).replaceChildren(
		'Scanned ',
		el( 'a', { href: commitUrl, textContent: data.commit.slice( 0, 10 ) } ),
		` · ${ new Date( data.generatedAt ).toLocaleString( undefined, { dateStyle: 'medium', timeStyle: 'short' } ) } · ${ fmt.format( data.fileCount ) } files`
	);
	const open = data.findings.filter( ( f ) => ! [ 'wontfix' ].includes( statusOf( f ) ) ).length;
	const clean = conventions.filter( ( c ) => c.violations === 0 ).length;
	const stats = [
		[ 'open findings', open ],
		[ 'conventions', conventions.length ],
		[ 'fully consistent', clean ],
		[ 'PRs linked', data.prs.length ],
	];
	$( 'stats' ).replaceChildren(
		...stats.map( ( [ label, value ] ) => el( 'div', {}, el( 'dt', { textContent: label } ), el( 'dd', { textContent: fmt.format( value ) } ) ) )
	);
}

function renderAreaOptions() {
	const counts = Map.groupBy( data.findings, areaOf );
	$( 'area' ).replaceChildren(
		el( 'option', { value: '', textContent: 'All areas' } ),
		...[ ...counts.keys() ].sort().map( ( a ) => el( 'option', { value: a, textContent: `${ a } (${ counts.get( a ).length })` } ) )
	);
}

function renderConventions() {
	$( 'conventions' ).replaceChildren(
		...conventions.map( ( c ) => {
			const visible = filtered( c.id ).length;
			const adherence = c.checked ? Math.round( ( 100 * ( c.checked - c.violations ) ) / c.checked ) : null;
			return el(
				'li',
				{},
				el(
					'button',
					{
						type: 'button',
						ariaPressed: String( state.convention === c.id ),
						onclick: () => ( location.hash = state.convention === c.id ? '' : encodeURIComponent( c.id ) ),
					},
					el(
						'div',
						{ className: 'conv-head' },
						el( 'span', { className: 'conv-title', innerHTML: inlineCode( c.title ) } ),
						el( 'span', { className: 'conv-count' + ( visible ? '' : ' zero' ), textContent: visible ? fmt.format( visible ) : '✓' } )
					),
					el(
						'div',
						{ className: 'conv-sub' },
						el( 'span', { className: `pill ${ c.status }`, textContent: c.status } ),
						c.source === 'claude' && el( 'span', { className: 'pill claude', textContent: 'Claude' } ),
						adherence !== null && [
							el( 'span', { className: 'bar', title: `${ adherence }% of ${ fmt.format( c.checked ) } consistent` }, el( 'span', { style: `width:${ adherence }%` } ) ),
							el( 'span', { textContent: `${ adherence }%` } ),
						]
					)
				)
			);
		} )
	);
}

function renderDetail() {
	const c = byId.get( state.convention );
	if ( ! c ) {
		$( 'detail' ).replaceChildren();
		return;
	}
	const counts = data.history.map( ( h ) => h.counts[ c.id ] ).filter( ( n ) => n !== undefined );
	$( 'detail' ).replaceChildren(
		el(
			'div',
			{ className: 'detail' },
			el( 'h2', { innerHTML: inlineCode( c.title ) } ),
			el( 'p', { innerHTML: inlineCode( c.description ?? '' ) } ),
			el(
				'div',
				{ className: 'detail-meta' },
				el( 'span', { className: `pill ${ c.status }`, textContent: c.status } ),
				el( 'code', { textContent: c.id } ),
				c.checked !== null && el( 'span', { textContent: `${ fmt.format( c.violations ) } of ${ fmt.format( c.checked ) } checked` } ),
				counts.length > 1 && sparkline( counts )
			)
		)
	);
}

function filtered( conventionId = state.convention ) {
	return data.findings.filter( ( f ) => {
		if ( conventionId && f.convention !== conventionId ) {
			return false;
		}
		if ( state.area && areaOf( f ) !== state.area ) {
			return false;
		}
		const status = statusOf( f );
		if ( state.status === 'active' ? status === 'wontfix' : state.status !== 'all' && status !== state.status ) {
			return false;
		}
		return ! state.q || ( f.file + ' ' + f.message ).toLowerCase().includes( state.q );
	} );
}

function renderFindings() {
	const list = filtered().sort( ( a, b ) => a.file.localeCompare( b.file ) );
	$( 'empty' ).hidden = list.length > 0;
	$( 'findings' ).replaceChildren( ...list.map( renderFinding ) );
}

function renderFinding( f ) {
	const slash = f.file.lastIndexOf( '/', f.file.length - 2 );
	const href = `https://github.com/${ data.githubRepo }/blob/${ data.commit }/${ data.root }/${ f.file.replace( /\/$/, '' ) }${ f.line ? '#L' + f.line : '' }`;
	const status = data.tracking[ f.id ]?.status;
	const note = data.tracking[ f.id ]?.note;
	return el(
		'li',
		{},
		el(
			'a',
			{ className: 'path', href, target: '_blank', rel: 'noopener' },
			el( 'span', { className: 'dir', textContent: f.file.slice( 0, slash + 1 ) } ),
			f.file.slice( slash + 1 ) + ( f.line ? `:${ f.line }` : '' )
		),
		el( 'div', { className: 'msg', innerHTML: inlineCode( f.message ) } ),
		( f.suggestion || note ) && el( 'div', { className: 'fix', innerHTML: inlineCode( [ f.suggestion, note ].filter( Boolean ).join( ' — ' ) ) } ),
		el(
			'div',
			{ className: 'side' },
			el( 'button', { type: 'button', className: 'copy', title: 'Copy id', textContent: f.id, onclick: copyId } ),
			! state.convention && el( 'span', { className: 'conv-tag', textContent: f.convention } ),
			f.source === 'claude' && el( 'span', { className: 'pill claude', textContent: 'Claude' } ),
			status && el( 'span', { className: `pill ${ status }`, textContent: status === 'wontfix' ? 'won’t fix' : status } ),
			prsFor( f ).map( prPill )
		)
	);
}

function renderPrs() {
	if ( ! data.prs.length ) {
		return;
	}
	$( 'prs-section' ).hidden = false;
	const sorted = [ ...data.prs ].sort( ( a, b ) => ( b.updatedAt ?? '' ).localeCompare( a.updatedAt ?? '' ) );
	$( 'prs' ).replaceChildren(
		...sorted.map( ( p ) =>
			el(
				'li',
				{},
				el( 'a', { href: p.url, target: '_blank', rel: 'noopener', textContent: p.title ? `#${ p.number } ${ p.title }` : `#${ p.number }` } ),
				el( 'div', { className: 'pr-meta' }, prPill( p ), ` · ${ p.ids.length } linked` )
			)
		)
	);
}

function prPill( p ) {
	const cls = p.state === 'MERGED' ? 'merged' : p.state === 'OPEN' ? 'open-pr' : 'proposed';
	return el( 'a', { className: `pill ${ cls }`, href: p.url, target: '_blank', rel: 'noopener', textContent: `#${ p.number } ${ ( p.state ?? '' ).toLowerCase() }` } );
}

function sparkline( values ) {
	const w = 120;
	const h = 24;
	const max = Math.max( ...values, 1 );
	const step = w / ( values.length - 1 );
	const points = values.map( ( v, i ) => `${ ( i * step ).toFixed( 1 ) },${ ( h - 2 - ( v / max ) * ( h - 4 ) ).toFixed( 1 ) }` ).join( ' ' );
	const wrap = el( 'span', { className: 'spark', title: `Findings per scan: ${ values.join( ' → ' ) }` } );
	wrap.innerHTML = `<svg width="${ w }" height="${ h }" viewBox="0 0 ${ w } ${ h }" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${ points }"/></svg>`;
	return wrap;
}

async function copyId( e ) {
	const button = e.currentTarget;
	const id = button.textContent;
	try {
		await navigator.clipboard.writeText( id );
		button.textContent = 'copied';
		setTimeout( () => ( button.textContent = id ), 900 );
	} catch {
		// Clipboard can be unavailable (insecure context, permissions); the id is visible anyway.
	}
}

// Messages are our own text with `backtick` code spans; escape everything else.
function inlineCode( text ) {
	const escaped = text.replace( /[&<>"]/g, ( ch ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } )[ ch ] );
	return escaped.replace( /`([^`]+)`/g, '<code>$1</code>' );
}
