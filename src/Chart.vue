<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Chart, Fetcher, Player, intervalsMs, InputSelect, indicator } from '@/lib';

import Volume2 from './custom-indicators/Volume2';// "custom" indicator sample

const indicators = { ...indicator.list, Volume2 } as const;

const { m1, h1, d1 } = intervalsMs;

type Tick = typeof defaultTick;
type DataTick = Record<string, Tick>;//__ structure of one ticks load

//_____ SETTINGS
const API_BASE = import.meta.env.VITE_API_BASE;
const SAMPLE_MODE = !API_BASE;//__ either using unique sample data json file  (true) or normal API mode ( false )
const defaultTick = { time: 0, open: 0, high: 0, low: 0, close: 0, vol: 0 } as const;//__ define the structure of your ticks
// chart works with 5 minimal tick properties: open, high, low, close & volume, if your API returns different format,
//   adapt the map below to match these needed properties to your tick properties ( notice tick prop 'vol' for 'volume'
const mapTickProps = { open: 'open', high: 'high', low: 'low', close: 'close', volume: 'vol' } as const;
const sampleTimeStart = 1684800000000;
const ticksPerLoad = SAMPLE_MODE ? 1000 : 500;// must match the ticks count per fetch
const ticksURL = SAMPLE_MODE
	? `${ window.location.origin }/tickschart/data/ticks_BTC_4h/${ sampleTimeStart }-${ ticksPerLoad }.json`
	//__ WARN: do no use API_BASE here, instead use current location with '/api' prefix to avoid all CORS problems for dev
	//__ '/api' url requests will be proxied by vite server which will use API_BASE, check vite.config.js server entry
	: `${ window.location.origin }/api/exch/market-ticks`;
const timeScaleMs = h1 * 4;// must match time scale of fetched data ( here 4h )
// const currentTime = new Date();// initial time position
const currentTime = new Date( Date.UTC( 2023, 10, 9 ) );
const xOriginRatio = .75;// screen width delta ratio, .75 = 3/4 width from left 
const dateFormatCrossHair = new Intl.DateTimeFormat( undefined, { 
	timeZone: 'UTC',
	weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
} );
//________ /SETTINGS

//___
const refChartWrapper = ref<HTMLElement>();

let sampleTicks: DataTick | null = null;

let chart: Chart<Tick>;
// let player: Player<Tick>;

const INTERVALS = {
	'1h': h1,
	'4h': h1*4,
}
type Intervals = keyof typeof INTERVALS;

const interval = ref<Intervals>('4h');

watch([() => interval.value], () => {
	fetcher.setTimeScale( INTERVALS[ interval.value ] );
	chart.setTickStep( INTERVALS[interval.value] );
});

const fetcher = new Fetcher( defaultTick, async ( startTime, limit ) => {
	if( SAMPLE_MODE && sampleTicks ){ return sampleTicks;}

	const url = new URL( ticksURL );
	
	url.search = new URLSearchParams( {// sample of params for API ( useless when SAMPLE_MODE ) 
		symbol: 'BTCUSDT',
		interval: interval.value,// if API requires interval as a string choice, of course it must corresponds to timeScaleMs value
		startTime: `${startTime}`,
		limit: `${limit}`,
		token: import.meta.env.VITE_API_TOKEN,// this could be used to easily allow request when protected API
	} ).toString();
	
	const response = await fetch( new Request( url, {  method: 'GET' } ) );
	
	if( response.ok ){
		try {
			sampleTicks = await response.json();
		}catch( err ){
			console.error( err );
		}
	}
	return sampleTicks;
}, {
	timeScaleMs,
	ticksPerLoad,
	prefetchMargin: 1,
	cacheSize: 2,
	onLoad: ( loadedRange, mightRefresh ) => {
		//__ refresh when new loaded so long indicators ( ex: ma 200 ) have their data progressively without waiting whole loaded
		if ( mightRefresh ){
			chart.refresh();
		}
	},
	// debug: true,
} );

const rangeLoadMs = ticksPerLoad * timeScaleMs;
onMounted( async () => {
	if( !refChartWrapper.value ){ return;}
	let init = false;//__ using to prevent fetching until chart fully initialized ( timeScale, symbol, etc )
	
	chart = new Chart<Tick>( refChartWrapper.value, timeScaleMs, SAMPLE_MODE ? ( index: number ) => {
		/*__ normally pass fetcher.getTick directly, but when SAMPLE_MODE
					we can bypass it to always return a tick from the file time range */
		return fetcher.getMapTicks( index )?.[ sampleTimeStart + index % rangeLoadMs ] || defaultTick;
	} : fetcher.getTick, {
		mapTickProps,
		onScalingXChange: async ( scalingX ) => {
			if( !init ){  return;}//__ avoid any fetch during initialization
			const fetches = fetcher.fetchTicks( scalingX.scaleIn.min, scalingX.scaleIn.max );
			return Promise.all( fetches );
		},
		crossHairLabelX: ( value ) => {
			const d = new Date( value );
			return `${dateFormatCrossHair.format( d )} (UTC)`;
		},
		uiScaleX: {
			stepsRange: [ m1, m1 * 5, m1 * 10, m1 * 15, m1 * 30, h1, h1 * 1.5, h1 * 3, h1 * 6, h1 * 12, d1 ],
			formatLabel: ( value: number ): string => {
				const d = new Date( value );
				if ( !( value % d1 ) ){
					return `${ d.getUTCDate() }`;
				}
				return `${ d.getUTCHours() }:${ `${d.getUTCMinutes()}`.padStart( 2, '0' ) }`;
			},
		},
		scaleY: {
			precisionIn: .001,//__ might be set from current symbol properties
		},
		autoScaleY: true,
		// tickWidth: 50,
		// chartRow: {
		// 	height: 200,
		// }
	} );
	
	// chart.addIndicator( new indicators.Volume( { maLength: 14, maType: 'ema' } ) );
	// chart.addIndicator( new indicators.Volume2( { maLength: 14, maType: 'sma' }) );
	
	// chart.addIndicator( new indicators.VolumeImpulse( { maLength: 14, maType: 'sma' } ) );
	chart.addIndicator( new indicators.OBV() );
	// chart.addIndicator( 'OBV', 'row' );

	chart.addIndicator( new indicators.MA({ length: 200, type: 'sma', style: { color: '#ff0000'} } ) );
	// chart.addIndicator( 'MA', 'layer', { property: 'close', length: 100, type: 'sma', style: { color: '#ffff00'} } );
	// chart.addIndicator( 'MA', 'layer', { property: 'close', length: 50, type: 'sma' } );
	// chart.addIndicator( 'MA', 'layer', { property: 'close', length: 21, type: 'sma' } );
	
	//__ in API mode, add a select input for timeframe to test change
	if(!SAMPLE_MODE){
		new InputSelect( 'timeframe', {
			relativeElement: chart.getElement( 'infos' ),
			relativePosition: 'prepend',
			value: interval.value,
			choices: Object.keys( INTERVALS ).map( ( value ) => ( { value, label: value } ) ),
			onChange: ( value ) => {
				interval.value = value;
			},
		} );
	}

	//__ can now apply the initial time & render
	init = true;
	chart.setX( currentTime.getTime(), { xOriginRatio } );

	//__ player
	/*player = */new Player( chart );
});

onBeforeUnmount( () => {
	chart?.beforeDestroy();
});

</script>

<template>
<div class="chart" ref="refChartWrapper">
</div>
</template>

<style lang="scss" scoped>
</style>
