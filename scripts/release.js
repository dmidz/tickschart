
/*//// heavily copied from Vue core release script https://github.com/vuejs/core/blob/main/scripts/release.js */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import minimist from 'minimist';
import { execa } from 'execa';
import semver from 'semver';
import pico from 'picocolors';
import enquirer from 'enquirer';
const { prompt } = enquirer;

//___
const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const currentVersion = createRequire( import.meta.url )( '../package.json' ).version;

const args = minimist( process.argv.slice( 2 ), {
	alias: {
		skipBuild: 'skip-build',
		skipTests: 'skip-tests',
		skipGit: 'skip-git',
		skipPrompts: 'skip-prompts',
	},
} );

const preId = args.preid || semver.prerelease( currentVersion )?.[ 0 ];

/** @type {ReadonlyArray<import('semver').ReleaseType>} */
const versionIncrements = [
	'patch',
	'minor',
	'major',
	...( preId
		? /** @type {const} */ [ 'prepatch', 'preminor', 'premajor', 'prerelease' ]
		: [] ),
];

let versionUpdated = false;

//___
async function main ( options = {} ){
	let targetVersion = options._[ 0 ];
	
	if( !targetVersion ){
		// no explicit version, offer suggestions
		/** @type {{ release: string }} */
		const { release } = await prompt( {
			type: 'select',
			name: 'release',
			message: 'Select release type',
			choices: versionIncrements
				.map( i => `${ i } (${ inc( i ) })` )
				// .concat( [ 'custom' ] ),
		} );

		if( release === 'custom' ){
			/** @type {{ version: string }} */
			const result = await prompt( {
				type: 'input',
				name: 'version',
				message: 'Input custom version',
				initial: currentVersion,
			} );
			targetVersion = result.version;
		} else {
			targetVersion = release.match( /\((.*)\)/ )?.[ 1 ] ?? '';
		}

		if( !semver.valid( targetVersion ) ){
			throw new Error( `invalid target version: ${ targetVersion }` );
		}

		/** @type {{ yes: boolean }} */
		// const { yes: confirmRelease } = await prompt( {
		// 	type: 'confirm',
		// 	name: 'yes',
		// 	message: `Confirm release v${ targetVersion } ?`,
		// } )
		//
		// if( !confirmRelease ){
		// 	return;
		// }

		/*__ Step: sync local develop from origin & derive new master */
		if( !options.dry ){
			step( 'Syncing local develop with origin...' );
			await run( 'git', [ 'fetch', '-u', 'origin', 'develop:develop', '--recurse-submodules=no', '--prune' ] );
			await run( 'git', [ 'checkout', 'develop' ] );
			//__ create release branch ?
			// await run( 'git', [ 'checkout','-b',`release/v${targetVersion}` ] );
		}

		// step( 'Running tests...' );

		step( 'Update version...' );
		updatePackageVersion( targetVersion );
		versionUpdated = true;

		step( 'Building...' );
		await run( 'npm', [ 'run', 'build' ] );

		step( 'Generating changelog...' );
		await run( `npm`, [ 'run', 'changelog' ] );
		
		step( 'Publishing...' );
		const publishFlags = [];
		if( options.dry ){
			publishFlags.push( '--dry-run' );
		}else{
			if( options.otp ){
				publishFlags.push( `--otp=${ options.otp }` );
			}
		}
		await publish( publishFlags );

		if( !options.dry ){
			step( 'Commiting changes...' );
			const { stdout } = await run( 'git', [ 'diff' ], { stdio: 'pipe' } );
			if( stdout ){
				await run( 'git', [ 'add', '-A' ] );
				await run( 'git', [ 'commit', '-m', `release v${ targetVersion }` ] );
				await run( 'git', [ 'tag', `v${ targetVersion }` ] );
			} else {
				console.log( 'No changes to commit.' );
				return;
			}
			/** @type {{ yes: boolean }} */
			const { pushOriginDev } = await prompt( {
				type: 'confirm',
				name: 'pushOriginDev',
				message: 'Push origin develop ?',
			} )

			if( pushOriginDev ){
				step( 'Pushing origin develop...' );
				await run( 'git', [ 'push' ] );
				await run( 'git', [ 'push', 'origin', `refs/tags/v${ targetVersion }` ] );
				// await run( 'git', [ 'push', `--tags` ] );
			}

			step( 'Merging local develop into local master...' );
			await run( 'git', [ 'fetch', '-u', 'origin', 'master:master', '--recurse-submodules=no', '--prune' ] );
			await run( 'git', [ 'checkout', 'master' ] );
			await run( 'git', [ 'merge', 'develop' ] );

			const { pushOriginMaster } = await prompt( {
				type: 'confirm',
				name: 'pushOriginMaster',
				message: 'Push origin master ?',
			} );

			if( pushOriginMaster ){
				step( 'Push origin master...' );
				await run( 'git', [ 'push' ] );
			}
			
		} else {
			console.log( `Dry run finished, running git diff to see package changes...` );
			// const { stdout } = await run( 'git', [ 'diff' ], { stdio: 'pipe' } );
			// console.log( stdout );
		}
	}
}

main( args )
.catch( err => {
	if( versionUpdated ){// revert to current version on failed releases
		updatePackageVersion( currentVersion );
	}
	console.error( err );
	process.exit( 1 );
} );

//___

async function publish ( flags ){
	try {
		const { stdout } = await run('npm',[
				'publish',
				// ...( releaseTag ? [ '--tag', releaseTag ] : [] ),
				'--access=public',
				...flags,
			],
			{
				// cwd: getPkgRoot( pkgName ),
				stdio: 'pipe',
			},
		)
		console.log( stdout );
		console.log( pico.green( `Package successfully published` ) );
	} catch(/** @type {any} */ e ) {
		if( e.stderr.match( /previously published/ ) ){
			console.log( pico.red( `Package already published` ) );
		} else {
			throw e;
		}
	}
}

function updatePackageVersion ( version ){
	const pkgPath = path.resolve( __dirname, '../package.json' );
	/** @type {Package} */
	const pkg = JSON.parse( fs.readFileSync( pkgPath, 'utf-8' ) );
	pkg.version = version;
	fs.writeFileSync( pkgPath, JSON.stringify( pkg, null, 2 ) + '\n' );
}

function inc(/** @type {import('semver').ReleaseType} */ i ){
	return semver.inc( currentVersion, i, preId );
}

async function run (
	/** @type {string} */ bin,
	/** @type {ReadonlyArray<string>} */ args,
	/** @type {import('execa').Options} */ opts = {},
){
	return execa( bin, args, { stdio: 'inherit', ...opts } );
}

function step(/** @type {string} */ msg ){
	return console.log( pico.bgGreen( pico.black( '»' ) ), pico.white( pico.bold( msg )) );
}