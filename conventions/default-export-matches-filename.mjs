import { basename, dirname, squash, stem } from '../lib/context.mjs';
import { getExports } from '../lib/ast.mjs';

export default {
	id: 'default-export-matches-filename',
	title: 'A default export is named after its file',
	category: 'naming',
	status: 'accepted',
	description:
		'`site-plan-card.tsx` default-exports `SitePlanCard` (or a qualified `SitesSitePlanCard`); `site-plan-card/index.tsx` does too. Matching names make components greppable from either side.',
	check( ctx ) {
		const candidates = ctx.files.filter( ( f ) => ctx.isSource( f ) && ! ctx.isTest( f ) && ! ctx.isStory( f ) );
		const findings = [];
		let checked = 0;
		for ( const file of candidates ) {
			const def = getExports( ctx, file ).find( ( e ) => e.isDefault && ! e.isReexport );
			if ( ! def?.name || def.name === 'default' ) {
				continue;
			}
			checked++;
			const owner = stem( file ) === 'index' ? basename( dirname( file ) ) : stem( file );
			// A qualifying prefix is fine: `AgencyClientSubscriptions` in `subscriptions/`.
			if ( ! owner || squash( def.name ).endsWith( squash( owner ) ) ) {
				continue;
			}
			findings.push( {
				file,
				line: ctx.lineOf( file, def.node ),
				message: `Default export \`${ def.name }\` doesn’t match \`${ owner }\`.`,
				suggestion: 'Rename the export or the file so the export name ends with the file name.',
			} );
		}
		return { checked, findings };
	},
};
