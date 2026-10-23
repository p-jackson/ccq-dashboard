import { basename, dirname } from '../lib/context.mjs';

const isHookFile = ( file ) => /^use-.+\.tsx?$/.test( basename( file ) );

export default {
	id: 'hook-folder-placement',
	title: 'Hooks are either all in `hooks/` or all beside their callers',
	category: 'structure',
	status: 'proposed',
	description:
		'A folder that has a `hooks/` subfolder keeps all its hooks there, and a `hooks/` folder is only worth having for more than one hook. A lone hook sits beside the code that uses it.',
	check( ctx ) {
		const hookFiles = ctx.files.filter( ( f ) => isHookFile( f ) && ! ctx.isTest( f ) );
		const inHooksDir = Map.groupBy(
			hookFiles.filter( ( f ) => basename( dirname( f ) ) === 'hooks' ),
			dirname
		);
		const findings = [];

		for ( const [ dir, files ] of inHooksDir ) {
			if ( files.length === 1 ) {
				findings.push( {
					file: files[ 0 ],
					message: `Only hook in \`${ dir }/\`.`,
					suggestion: `Move it up to \`${ dirname( dir ) || '.' }/\` and remove the \`hooks/\` folder.`,
				} );
			}
		}
		for ( const file of hookFiles ) {
			const dir = dirname( file );
			if ( basename( dir ) !== 'hooks' && inHooksDir.has( ( dir ? dir + '/' : '' ) + 'hooks' ) ) {
				findings.push( {
					file,
					message: `\`${ dir }/\` has a \`hooks/\` folder, but this hook sits beside it.`,
					suggestion: `Move it into \`${ dir }/hooks/\`.`,
				} );
			}
		}
		return { checked: hookFiles.length, findings };
	},
};
