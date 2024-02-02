import { Chart, Fetcher, defaultTick, intervalsMs, type CandleTick } from '../../dist';
import './style.css';
import { ref } from 'vue';

//__
const { m1, h1, d1 } = intervalsMs;
type DataTick = Record<string, CandleTick>;

//__ settings
const sampleTicksURL = `${ window.location.origin }/data/ticks_BTC_4h/1692000000000.json`;
let sampleTicks: DataTick | null = null;
const timeScaleMs = h1 * 4;
const ticksPerLoad = 500;
const rangeLoadMs = ticksPerLoad * timeScaleMs;
const xOriginRatio = .75;
const currentTime = ref( new Date( Date.UTC( 2023, 9, 10 ) ) );

//__
const fetcher = new Fetcher<CandleTick, DataTick>( defaultTick, async ( startTime, limit ) => {
	/*__ this example uses a unique local json file ( 500 ticks ) served in dev mode, replace this by an API call
	 with passed params such startTime & limit + other such symbol & timeScale string ( 15m / 4h / d1... ) */

	if ( sampleTicks ){
		return sampleTicks;
	}

	const url = new URL( sampleTicksURL );

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
	// debug: true,
} );

//__
const dateFormatCrossHair = new Intl.DateTimeFormat( undefined, {
	timeZone: 'UTC',
	weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
} );

const chart = new Chart( document.getElementById('chart'), timeScaleMs, ( index: number ) => {
	/*__ one would normally pass fetcher.getTick directly, but for the only one file sample
				we can bypass it to always return a tick from the file ( 1692000000000 ) time range */
	return fetcher.getMapTicks( index )?.[ 1692000000000 + index % rangeLoadMs ] || defaultTick;
}, {
	onScalingXChange: async ( scalingX ) => {
		// if ( !init ){
		// 	return;
		// }//__ avoid any fetch during initialization
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

chart.addIndicator( 'Volume', 'vol-1', { maLength: 14 } );
chart.setX( currentTime.value.getTime(), { render: true, xOriginRatio } );