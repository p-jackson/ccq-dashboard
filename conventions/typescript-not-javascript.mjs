import { basename } from '../lib/context.mjs';

const isJavaScript = ( file ) => /\.(js|jsx|mjs|cjs)$/.test( file );

// Tool config files (`eslint.config.mjs` etc.) are loaded by Node directly, so they stay JavaScript.
const isToolConfig = ( file ) => /\.config\.(js|mjs|cjs)$/.test( basename( file ) );

export default {
	id: 'typescript-not-javascript',
	title: 'Code is TypeScript, not JavaScript',
	category: 'naming',
	status: 'accepted',
	description:
		'Source and test files use `.ts` / `.tsx`, never `.js` / `.jsx`, so everything is type-checked. Tool config files such as `eslint.config.mjs` are exempt.',
	check( ctx ) {
		const candidates = ctx.files.filter( ( f ) => isJavaScript( f ) && ! isToolConfig( f ) );
		const tsCount = ctx.files.filter( ctx.isSource ).length;
		const findings = candidates.map( ( file ) => ( {
			file,
			message: `\`${ basename( file ) }\` is JavaScript.`,
			suggestion: `Convert to TypeScript as \`${ basename( file ).replace( /\.[mc]?js(x?)$/, '.ts$1' ) }\` (\`.tsx\` if it contains JSX).`,
		} ) );
		return { checked: candidates.length + tsCount, findings };
	},
};
