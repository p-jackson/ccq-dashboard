import { basename } from '../lib/context.mjs';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Docs that are conventionally upper-case, and Sass partials.
const EXEMPT = /^(README|AGENTS|CLAUDE|CHANGELOG)\.md$|^\.|^_/;

export default {
	id: 'kebab-case-paths',
	title: 'File and folder names are kebab-case',
	category: 'naming',
	status: 'accepted',
	description:
		'Every directory and file name (before its extensions) is lower-case kebab-case, e.g. `site-settings/use-site-plan.ts`.',
	check( ctx ) {
		const findings = [];
		for ( const dir of ctx.dirs ) {
			if ( ! KEBAB.test( basename( dir ) ) ) {
				findings.push( { file: dir + '/', message: `Folder \`${ basename( dir ) }\` is not kebab-case.` } );
			}
		}
		for ( const file of ctx.files ) {
			const name = basename( file );
			if ( ! EXEMPT.test( name ) && ! KEBAB.test( name.replace( /\..*$/, '' ) ) ) {
				findings.push( { file, message: `File \`${ name }\` is not kebab-case.` } );
			}
		}
		return { checked: ctx.dirs.length + ctx.files.length, findings };
	},
};
