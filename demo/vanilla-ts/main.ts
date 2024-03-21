
import { Chart, Fetcher, intervalsMs } from '@dmidz/tickschart';

const { m1, h1, d1 } = intervalsMs;

//__
type Tick = typeof defaultTick;
type DataTick = Record<string, Tick>;

//_____ main settings
const defaultTick = { time: 0, open: 0, high: 0, low: 0, close: 0, vol: 0 } as const;//__ define the structure of your ticks
// Chart works with 5 minimal tick properties: open, high, low, close & volume, if your API returns different format,
// adapt the map below to match these properties to your tick properties
const mapTickProps = { open: 'open', high: 'high', low: 'low', close: 'close', volume: 'vol' } as const;
// ! adapt this path to your public sample path ( native fetch needs absolute URL )
const sampleTimeStart = 1684800000000;
const ticksPerLoad = 1000;// must match the ticks count per fetch
const sampleTicksURL = `/data/ticks_BTC_4h/${ sampleTimeStart }-${ ticksPerLoad }.json`;
const timeScaleMs = h1 * 4;// must match time scale of fetched data ( here 4h )
const currentTime = new Date( Date.UTC( 2023, 9, 10 ) );// initial time position
const xOriginRatio = .75;// screen width delta ratio, .75 = 3/4 width from left 
const dateFormatCrossHair = new Intl.DateTimeFormat( undefined, {
	timeZone: 'UTC',
	weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
} );
//__

let sampleTicks: DataTick | null = null;
const fetcher = new Fetcher( defaultTick, async ( startTime, limit ) => {
	/*__ this example uses a unique local json file ( 1000 ticks ) served in dev mode, replace this by an API call
	 with passed params such startTime & limit + other such symbol & timeScale string ( 15m / 4h / d1... ) */

	if ( sampleTicks ){
		return sampleTicks;
	}

	const url = new URL( sampleTicksURL, window.location.origin );

	url.search = new URLSearchParams( {// sample of params for API, useless here with local json fetch 
		symbol: 'BTCUSDT',
		interval: '4h',// if API requires interval as a string choice, of course it must corresponds to timeScaleMs value
		startTime: `${ startTime }`,
		limit: `${ limit }`,
	} ).toString();

	const response = await fetch( new Request( url, { method: 'GET' } ) );

	if ( response.ok ){
		try {
			sampleTicks = await response.json();
		} catch ( err ){
			console.error( err );
		}
	}
	return sampleTicks;
}, {
	timeScaleMs,
	ticksPerLoad,
	prefetchMargin: 1,
	cacheSize: 2,
	onLoad: ( time, mightRefresh ) => {
		//__ refresh when new loaded so long indicators ( ex: ma 200 ) have their data progressively without waiting whole loaded
		if ( mightRefresh ){
			chart.refresh();
		}
	},
	// debug: true,
} );

//__
const rangeLoadMs = ticksPerLoad * timeScaleMs;
const chart = new Chart( document.getElementById('chart'), timeScaleMs, ( index: number ) => {
	/*__ one would normally pass fetcher.getTick directly, but for the only one file sample
				we can bypass it to always return a tick from the file ( 1692000000000 ) time range */
	return fetcher.getMapTicks( index )?.[ sampleTimeStart + index % rangeLoadMs ] || defaultTick;
}, {
	mapTickProps,
	onScalingXChange: async ( scalingX ) => {
		// if ( !init ){ return;}//__ avoid any fetch during initialization
		const fetches = fetcher.fetchTicks( scalingX.scaleIn.min, scalingX.scaleIn.max );
		return Promise.all( fetches );
	},
	crossHairLabelX: ( value ) => {
		const d = new Date( value );
		return `${ dateFormatCrossHair.format( d ) } (UTC)`;
	},
	uiScaleX: {
		stepsRange: [ m1, m1 * 5, m1 * 10, m1 * 15, m1 * 30, h1, h1 * 1.5, h1 * 3, h1 * 6, h1 * 12, d1 ],
		formatLabel: ( value: number ): string => {
			const d = new Date( value );
			if ( !( value % d1 ) ){
				return `${ d.getUTCDate() }`;
			}
			return `${ d.getUTCHours() }:${ `${ d.getUTCMinutes() }`.padStart( 2, '0' ) }`;
		},
	},
	scaleY: {
		precisionIn: .001,//__ might be set from current symbol properties
	},
	autoScaleY: true,
} );

chart.addIndicator( 'Volume', 'row', { maLength: 14, maType: 'sma' } );
chart.addIndicator( 'MA', 'layer', { property: 'close', length: 200, type: 'sma', style: { color: '#ff0000' } } );
chart.addIndicator( 'MA', 'layer', { property: 'close', length: 100, type: 'sma', style: { color: '#ffff00' } } );
chart.addIndicator( 'MA', 'layer', { property: 'close', length: 50, type: 'sma' } );

chart.setX( currentTime.getTime(), { xOriginRatio } );