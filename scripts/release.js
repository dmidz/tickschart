
/*//// inspired from Vue core release script https://github.com/vuejs/core/blob/main/scripts/release.js */

import { createRequire } from 'node:module';
import minimist from 'minimist';
import { execa } from 'execa';
import semver from 'semver';
import pico from 'picocolors';
import enquirer from 'enquirer';
const { prompt } = enquirer;

//___
const currentVersion = await packageVersion();

const args = minimist( process.argv.slice( 2 ), {
	alias: {
		skipBuild: 'skip-build',
		skipTests: 'skip-tests',
		skipPublish: 'skip-publish',
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

main( args )
	.catch( err => {
		console.error( err );
		process.exit( 1 );
	} );


async function main ( options = {} ){
	step('Starting release with options', options );
	const targetVersion = await pickVersion( options._[ 0 ] );

	await branchSync( 'develop', true );

	//__ create release branch ?
	// await run( 'git', [ 'checkout','-b',`release/v${targetVersion}` ] );

	if( !options.skipTests ){
		await runTest();
	}

	if(!options.skipBuild){
		await build();
	}

	await updateVersion( targetVersion );// must update version before changelog

	const changelogGood = await changelog();
	if( !changelogGood ){ return;}

	if( !options.skipPublish ){
		await publish( options );
	}

	if( !options.skipGit ){
		const anyChanges = await commitRelease( targetVersion );
		if( !anyChanges ){ return;}

		await pushOrigin( 'develop', targetVersion );

		await branchMerge( 'master', 'develop' );

		await pushOrigin( 'master' );

		await run( 'git', [ 'checkout', 'develop' ] );

	} else {
		step( `git operations skipped, run git diff to check changes.` );
		// const { stdout } = await run( 'git', [ 'diff' ], { stdio: 'pipe' } );
		// console.log( stdout );
	}
}

//___
async function packageVersion(){
	return createRequire( import.meta.url )( '../package.json' ).version;
	// const { stdout } = await run( 'npm', [ 'pkg', 'get', 'version' ], { stdio: 'pipe' } );// this sh*t incl quotes -_-
	// return stdout;
}

async function pickVersion( targetVersion ){
	
	let resVersion = targetVersion;

	if( !resVersion ){
		// no explicit version, offer suggestions
		/** @type {{ yes: string }} */
		const { yes: release } = await prompt( {
			type: 'select',
			name: 'yes',
			message: 'Select release type',
			choices: versionIncrements
				.map( i => `${ i } (${ inc( i ) })` )
			.concat( [ 'custom' ] ),
		} );

		if( release === 'custom' ){
			/** @type {{ version: string }} */
			const result = await prompt( {
				type: 'input',
				name: 'version',
				message: 'Input custom version',
				initial: currentVersion,
			} );
			resVersion = result.version;
		} else {
			resVersion = release.match( /\((.*)\)/ )?.[ 1 ] ?? '';
		}

	}

	if( !semver.valid( resVersion ) ){
		throw new Error( `invalid target version: ${ resVersion }` );
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

	return resVersion;
}

async function branchSync( branch = 'develop', checkout = true ){
	if( !branch ){ throw new Error( 'branch is required' );}

	step( `Syncing local ${branch} with origin...` );
	await run( 'git', [ 'fetch', '-u', 'origin', `${branch}:${ branch }`, '--recurse-submodules=no', '--prune' ] );
	if( checkout ){
		await run( 'git', [ 'checkout', branch ] );
	}
}

async function build (){
	step( 'Building...' );
	await run( 'npm', [ 'run', 'build' ] );
}

async function runTest(){
	step( 'Running tests...' );
	await run( 'npm', [ 'run', 'test' ] );
}

async function updateVersion( version, msg = 'Updating version...' ){
	if( !version ){	throw new Error('version is required');}

	step( `${msg} [ ${version} ]` );
	await run( 'npm', [ '--no-git-tag-version', 'version', version ] );
}

async function changelog(){
	step( 'Updating changelog...' );
	await run( `npm`, [ 'run', 'changelog' ] );
	/** @type {{ yes: boolean }} */
	const { yes: changelogGood } = await prompt( {
		type: 'confirm',
		name: 'yes',
		message: `Changelog generated. Does it look good ?`,
	} );
	return changelogGood;
}

async function publish( options = {} ){
	step( `Publishing ${ options.dry ? 'dry' : '' }...` );
	const publishFlags = [];
	if( options.dry ){
		publishFlags.push( '--dry-run' );
	} else {
		/** @type {{ otp: string }} */
		const { otp = '' } = await prompt( {
			type: 'input',
			name: 'otp',
			message: `Please enter otp code (leave blank if not required by the npm registry target):`,
		} );

		if( otp?.length ){
			publishFlags.push( `--otp=${ otp }` );
		}
	}
	
	try {
		const { stdout } = await run( 'npm', [
				'publish',
				// ...( releaseTag ? [ '--tag', releaseTag ] : [] ),
				'--access=public',
				...publishFlags,
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

async function commitRelease( version ){
	if( !version ){ throw new Error( 'version is required' );}
	step( 'Commiting changes...' );
	const { stdout } = await run( 'git', [ 'diff' ], { stdio: 'pipe' } );
	if( stdout ){
		await run( 'git', [ 'add', '-A' ] );
		await run( 'git', [ 'commit', '-m', `release v${ version }` ] );
		await run( 'git', [ 'tag', `v${ version }` ] );
		return true;
	} else {
		console.log( 'No change to commit.' );
		return false;
	}

}

async function pushOrigin( branch = 'develop', tagVersion ){
	if( !branch ){ throw new Error( 'branch is required' );}
	/** @type {{ yes: boolean }} */
	const { yes: push } = await prompt( {
		type: 'confirm',
		name: 'yes',
		message: `Push to origin ${branch} ?`,
	} )

	if( push ){
		step( `Pushing to origin ${branch}...` );
		await run( 'git', [ 'push', 'origin', branch ] );
		if( tagVersion ){
			await run( 'git', [ 'push', 'origin', `refs/tags/v${ tagVersion }` ] );
		}
		// await run( 'git', [ 'push', `--tags` ] );
	}
}

async function branchMerge( branchTo, branchFrom = 'develop' ){
	if( !branchTo ){ throw new Error( 'branchTo is required' );}

	await branchSync( branchTo, true );
	step( `Merging local ${ branchFrom } into local ${ branchTo }...` );
	await run( 'git', [ 'merge', branchFrom ] );

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

function step(/** @type {string} */ msg, trace = '' ){
	return console.log( pico.bgGreen( pico.black( '»' ) ), pico.white( pico.bold( msg )), trace );
}