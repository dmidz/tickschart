
//_____
export type Options = {
	timeScaleMs?: number,// nb ms per tick
	ticksPerLoad?: number,// nb of records per request 
	prefetchMargin?: number,// nb of prefetch loads ( before & after current view ) avoiding user seeing loads
	cacheSize?: number,//__ nb of ticks loads to be kept im memory, out of currently viewed ones
	/* __ fetchOnDemand will auto magically call a fetch when any mapTicks[time] not available yet
			necessary for long indicators ( ex MA 200 periods ) needing data far left of current view */
	fetchOnDemand?: boolean,
	/*__ onLoad gives opportunity to refresh display ( called only on true new load finish ) */
	onLoad?: ( time: number, mightRefresh?: boolean, isPrefetch?: boolean ) => void,
	debug?: boolean,
}

export type LoadedTimeRange = { min: number, max: number, [key: string]: any };

export type FetchTicks<FetchResult> = ( startTime: number, limit: number ) => Promise<FetchResult|null>;

//______
export default class Fetcher<Tick,FetchResult extends Record<string, Tick>, Range extends LoadedTimeRange = LoadedTimeRange> {
	private options: Required<Options> = {
		timeScaleMs: 1000 * 60 * 60,
		ticksPerLoad: 200,
		prefetchMargin: 1,//__ prefer minimum 1 so fast drag through entire screen width won't show loading
		cacheSize: 2,
		fetchOnDemand: true,
		onLoad: () => {},
		debug: false,
	}
	private timePerLoad = this.options.timeScaleMs * this.options.ticksPerLoad;
	private loadedMin = Infinity;
	private loadedMax = -Infinity;
	private firstSize = 0;
	private timeoutRelease: ReturnType<typeof setTimeout> | undefined;
	private mapTicks = new Map<number, FetchResult>();
	private mapFetches = new Map<number, Promise<Range|null>>();
	private mapRefresh = new Map<number,true>;
	
	constructor( private defaultTick: Tick, private fetch: FetchTicks<FetchResult>, options: Options = {} ){
		Object.assign( this.options, options );
		this.setTimeScale( this.options.timeScaleMs );
	}

	setTimeScale( timeScaleMs: number ){
		this.options.timeScaleMs = timeScaleMs;
		this.timePerLoad = this.options.timeScaleMs * this.options.ticksPerLoad;
		this.reset();
		return timeScaleMs;
	}

	fetchTicks( timeStart: number, timeEnd: number, opts: { prefetch?: boolean } = { prefetch: true } ): Promise<Range|null>[]{
		const debug = this.options.debug;

		const res: Promise<Range|null>[] = [];
		if ( timeEnd < timeStart ){
			console.warn( new Error( 'timeEnd <= timeStart' ) );
			return res;
		}

		clearTimeout( this.timeoutRelease );

		let loadedStart = Math.floor( timeStart / this.timePerLoad ) * this.timePerLoad;
		this.loadedMin = Math.min( this.loadedMin, loadedStart );
		let loadedEnd = Math.floor( timeEnd / this.timePerLoad ) * this.timePerLoad;
		this.loadedMax = Math.max( this.loadedMax, loadedEnd );

		let time = loadedStart;

		while ( time <= timeEnd ){
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
								debug && console.log( 'loaded', time, new Date( time ).toUTCString(), Object.keys( r ).length );
								this.mapTicks.set( time, r );
								const res: LoadedTimeRange = { min: time, max: time + this.timePerLoad };
								this.options.onLoad( time, this.mapRefresh.get( time ), !opts.prefetch );
								this.mapRefresh.delete( time );
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
		
		// console.log( 'fetchTicks', {
		// 	prefetch,
		// 	loadLen: res.length,
		// 	loadedStart,
		// 	loadedEnd,
		// 	loadedMin: this.loadedMin,
		// 	loadedMax: this.loadedMax,
		// } );

		//__
		if ( opts.prefetch && res.length ){
			const d = this.timePerLoad * this.options.prefetchMargin;
			loadedStart = Math.floor( ( loadedStart - d ) / this.timePerLoad ) * this.timePerLoad;
			loadedEnd = Math.floor( ( loadedEnd + d ) / this.timePerLoad ) * this.timePerLoad;
			// console.log( 'fetchTicks prefetch', res.length, { loadedStart, loadedEnd } );

			Promise.all( res )//__ wait current range loaded
				.then( ( /*fetches*/ ) => {
					//__ pre fetch sides so loading is not visible
					return Promise.all( this.fetchTicks( loadedStart, loadedEnd, { prefetch: false } ) );
				} )
				.then( ( /*prefetches*/ ) => {

					if ( !this.firstSize ){
						this.firstSize = this.mapFetches.size;
					}

					debug && console.log('prefetch loaded', { timeScale: this.options.timeScaleMs, loadedStart, loadedEnd, loadedMin: this.loadedMin, loadedMax: this.loadedMax } );
					clearTimeout( this.timeoutRelease );
					this.timeoutRelease = setTimeout( this.releaseTicks.bind( this, { loadedStart, loadedEnd } ), 2000 );
				} );
		}

		//__
		return res;
	}
	
	getTick( time: number ): Tick {
		return this.getMapTicks( time )?.[ time ]||this.defaultTick;
	}

	getMapTicks( time: number ): FetchResult | undefined {
		const t = Math.floor( +time / this.timePerLoad ) * this.timePerLoad;
		const res = this.mapTicks.get( t );
		if( !res && this.options.fetchOnDemand ){
			this.mapRefresh.set( t, true );
			if( !this.mapFetches.get( t ) ){
				this.fetchTicks( t, t + this.timePerLoad, { prefetch: false } );
			}
		}
		return res;
	}

	reset(){
		clearTimeout( this.timeoutRelease );
		this.loadedMin = Infinity;
		this.loadedMax = -Infinity;
		this.firstSize = 0;
		this.mapTicks = new Map();
		this.mapFetches = new Map();
		this.mapRefresh = new Map();
	}

	//__ clean cache
	private releaseTicks( { loadedStart, loadedEnd }: { loadedStart: number, loadedEnd: number } ){
		// console.log( 'releaseTicks', { size: this.mapTicks.size, loadedStart, loadedEnd, loadingMin: this.loadedMin, loadedMax: this.loadedMax } );
		const cacheDist = this.options.cacheSize * this.timePerLoad;

		if ( this.loadedMin ){
			const timeStart = loadedStart - this.timePerLoad - cacheDist;
			let time = timeStart;
			while ( time >= this.loadedMin ){
				this.mapTicks.delete( time );
				this.mapFetches.delete( time );
				time -= this.timePerLoad;
			}
			this.loadedMin = timeStart;
		}

		if ( this.loadedMax ){
			const timeStart = loadedEnd + this.timePerLoad + cacheDist;
			let time = timeStart;
			while ( time <= this.loadedMax ){
				this.mapTicks.delete( time );
				this.mapFetches.delete( time );
				time += this.timePerLoad;
			}
			this.loadedMax = timeStart;
		}

		// console.log( 'new size', this.mapFetches.size, this.mapTicks.keys() );
		if ( this.mapTicks.size > this.firstSize + this.options.cacheSize ){
			console.warn( 'mapTicks.size growing', this.mapTicks.size );
		}

	}
}