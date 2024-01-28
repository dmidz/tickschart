
//_____
export type Options = {
	timeScaleMs?: number,// nb of records requested 
	ticksPerLoad?: number,// nb of records requested 
	prefetchMargin?: number,// nb of prefetch loads ( before & after current view ) avoiding user seeing loads
	cacheSize?: number,//__ nb of ticks loads to be kept im memory, out of currently viewed ones
}

export type LoadedTimeRange = { min: number, max: number, [key: string]: any };

export type FetchTicks<FetchResult> = ( startTime: number, limit: number ) => Promise<FetchResult|null>;

//______
export default class FetcherTicks<Tick,FetchResult extends Record<string, Tick>, Range extends LoadedTimeRange = LoadedTimeRange> {
	private defaultTick: Tick;
	private fetch: FetchTicks<FetchResult>;
	private options: Required<Options> = {
		timeScaleMs: 1000 * 60 * 60,
		ticksPerLoad: 200,
		prefetchMargin: 1,//__ prefer minimum 1 so fast drag through screen width won't show loading
		cacheSize: 2,
	}
	private timePerLoad = this.options.timeScaleMs * this.options.ticksPerLoad;
	private loadedMin = Infinity;
	private loadedMax = -Infinity;
	private firstSize = 0;
	private timeoutRelease: ReturnType<typeof setTimeout> | undefined;
	private mapTicks = new Map<number, FetchResult>();
	private mapFetches = new Map<number, Promise<Range|null>>();

	constructor( defaultTick: Tick, fetch: FetchTicks<FetchResult>, options: Options = {} ){
		this.defaultTick = defaultTick;
		this.fetch = fetch;
		Object.assign( this.options, options );
		this.setTimeScale( this.options.timeScaleMs );
	}

	setTimeScale = ( timeScaleMs: number ) => {
		this.options.timeScaleMs = timeScaleMs;
		this.timePerLoad = this.options.timeScaleMs * this.options.ticksPerLoad;
		this.reset();
		return timeScaleMs;
	}

	fetchTicks = ( timeStart: number, timeEnd: number, prefetch = true, onLoad?: ( loaded: Range, timeScaleMs: number ) => void ): Promise<Range|null>[] => {
		const debug = false;

		const res: Promise<Range|null>[] = [];
		if ( timeEnd < timeStart ){
			console.warn( new Error( 'timeEnd <= timeStart' ) );
			return res;
		}

		clearTimeout( this.timeoutRelease );

		let time = Math.floor( timeStart / this.timePerLoad ) * this.timePerLoad;
		// console.log('fetchTicks2', timeStart, time, this.timePerLoad );
		let loadedStart = time;
		let loadedEnd = time;
		this.loadedMin = Math.min( this.loadedMin, loadedStart );
		this.loadedMax = Math.max( this.loadedMax, loadedEnd );
		
		const _timeEnd = Math.min( timeEnd, Date.now() );

		while ( time <= _timeEnd ){
			debug && console.log( 'time', time );
			const ticks = this.mapTicks.get( time );
			if ( !ticks ){
				let p = this.mapFetches.get( time );
				if ( !p ){
					p = Promise.resolve( time )
						.then( ( time ) => {
							debug && console.log( 'fetch', time );
							return this.fetch( time, this.options.ticksPerLoad )
							.then( ( r ) => {
								if ( !r ){
									return Promise.reject( 'response is null' );
								}
								debug && console.log( 'loaded', time, Object.keys( r ).length );
								this.mapTicks.set( time, r );
								const res: LoadedTimeRange = { min: time, max: time + this.timePerLoad };
								onLoad?.( res as Range, this.options.timeScaleMs );
								return res as Range;
							} )
							.catch( err => {
								console.warn('Fetch failed', err );
								return null;
							});
						} );

					this.mapFetches.set( time, p );
				}
				res.push( p );
			}
			time += this.timePerLoad;
		}
		loadedEnd = time;
		this.loadedMax = Math.max( this.loadedMax, loadedEnd );

		debug && console.log( 'fetchTicks', {
			prefetch,
			loadLen: res.length,
			loadedStart,
			loadedEnd,
			loadedMin: this.loadedMin,
			loadedMax: this.loadedMax,
		} );

		//__
		if ( prefetch ){
			const d = this.timePerLoad * this.options.prefetchMargin;
			loadedStart = Math.floor( ( loadedStart - d ) / this.timePerLoad ) * this.timePerLoad;
			loadedEnd = Math.floor( ( loadedEnd + d ) / this.timePerLoad ) * this.timePerLoad;
			// console.log( 'fetchTicks prefetch', { loadedStart, loadedEnd } );

			Promise.all( res )//__ wait current range loaded
				.then( ( /*fetches*/ ) => {
					//__ pre fetch sides so loading is not visible
					return Promise.all( this.fetchTicks( loadedStart, loadedEnd, false ) );
				} )
				.then( ( /*prefetches*/ ) => {

					if ( !this.firstSize ){
						this.firstSize = this.mapFetches.size;
					}

					// console.log('prefetch loaded', { loadedStart, loadedEnd } );
					clearTimeout( this.timeoutRelease );
					this.timeoutRelease = setTimeout( this.releaseTicks.bind( this, { loadedStart, loadedEnd } ), 2000 );
				} );
		}

		//__
		return res;
	}

	getTick = ( time: number ): Tick => {
		const t = Math.floor( +time / this.timePerLoad ) * this.timePerLoad;
		const m = this.mapTicks.get( t );
		// const d = new Date( time ).toLocaleString( undefined, { timeZone: 'UTC' } );
		// console.log( 'getTick', d, time, m[ time ] );
		return m?.[ time ]||this.defaultTick;
	}

	reset = () => {
		clearTimeout( this.timeoutRelease );
		this.loadedMin = Infinity;
		this.loadedMax = -Infinity;
		this.firstSize = 0;
		this.mapTicks = new Map();
		this.mapFetches = new Map();
	}

	private releaseTicks = ( { loadedStart, loadedEnd }: { loadedStart: number, loadedEnd: number } ) => {
		// console.log( 'releaseTicks', { size: mapTicks.size, loadedStart, loadedEnd, loadedMin, loadedMax } );
		const cacheDist = this.options.cacheSize * this.timePerLoad;

		if ( this.loadedMin ){
			const timeStart = loadedStart - this.timePerLoad - cacheDist;
			let time = timeStart;
			while ( time >= this.loadedMin ){
				// console.log('  release >=', { time, loadedMin } );
				this.mapTicks.delete( time );
				this.mapFetches.delete( time );
				time -= this.timePerLoad;
			}
			this.loadedMin = timeStart;
		}

		if ( this.loadedMax ){
			const timeStart = loadedEnd + this.timePerLoad + cacheDist;
			let time = timeStart;
			// console.log('loadedMax', { time, loadedMax }, mapTicks.keys());
			while ( time <= this.loadedMax ){
				// console.log( '  release <=', { time, loadedMax } );
				this.mapTicks.delete( time );
				this.mapFetches.delete( time );
				time += this.timePerLoad;

			}
			this.loadedMax = timeStart;
		}

		if ( this.mapFetches.size > this.firstSize + 5 + this.options.cacheSize ){
			console.warn( 'mapTicks.size growing', this.mapFetches.size );
		}
		// console.log( 'new size', mapFetches.size, mapTicks.keys() );

	}

}