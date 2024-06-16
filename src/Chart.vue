<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Chart, Fetcher, Player, intervalsMs } from '@/lib';

const { m1, h1, d1 } = intervalsMs;

type Tick = typeof defaultTick;
type DataTick = Record<string, Tick>;//__ structure of one ticks load

//_____ main settings
const defaultTick = { time: 0, open: 0, high: 0, low: 0, close: 0, vol: 0 } as const;//__ define the structure of your ticks
// chart works with 5 minimal tick properties: open, high, low, close & volume, if your API returns different format,
//   adapt the map below to match these needed properties to your tick properties
const mapTickProps = { open: 'open', high: 'high', low: 'low', close: 'close', volume: 'vol' } as const;
// this example uses a unique local json file ( 1000 ticks ) served in dev mode, replace this by an API call
//	 with passed params such startTime & limit + other such symbol & timeScale string ( 15m / 4h / d1... ) */
const sampleTimeStart = 1684800000000;
const ticksPerLoad = 1000;// must match the ticks count per fetch
const ticksURL = `${ window.location.origin }/tickschart/data/ticks_BTC_4h/${ sampleTimeStart }-${ ticksPerLoad }.json`;
const timeScaleMs = h1 * 4;// must match time scale of fetched data ( here 4h )
// const currentTime = new Date();// initial time position
// const currentTime = new Date( Date.UTC(2023, 6, 13 ) );// initial time position
const currentTime = new Date( Date.UTC(2023, 7, 4 ) );// initial time position
const xOriginRatio = .75;// screen width delta ratio, .75 = 3/4 width from left 
const dateFormatCrossHair = new Intl.DateTimeFormat( undefined, { 
	timeZone: 'UTC',
	weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
} );

//__
const refChartWrapper = ref<HTMLElement>();

let sampleTicks: DataTick | null = null;

let chart: Chart<Tick>;
// let player: Player<Tick>;

const fetcher = new Fetcher( defaultTick, async ( startTime, limit ) => {
	if( sampleTicks ){ return sampleTicks;}

	const url = new URL( ticksURL );
	
	url.search = new URLSearchParams( {// sample of params for API ( useless with local json fetch ) 
		symbol: 'BTCUSDT',
		interval: '4h',// if API requires interval as a string choice, of course it must corresponds to timeScaleMs value
		startTime: `${startTime}`,
		limit: `${limit}`,
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
	onLoad: ( time, mightRefresh ) => {
		// console.log('onLoad', { time, mightRefresh });
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
	
	chart = new Chart<Tick>( refChartWrapper.value, timeScaleMs, ( index: number ) => {
		/*__ one would normally pass fetcher.getTick directly, but for the only one file sample
					we can bypass it to always return a tick from the file ( 1692000000000 ) time range */
		return fetcher.getMapTicks( index )?.[ sampleTimeStart + index % rangeLoadMs ] || defaultTick;
	}, {
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
		// tickWidth: 15,
		// chartRow: {
		// 	height: 200,
		// }
	} );
	
	chart.addIndicator( 'Volume', 'row', { maLength: 14, maType: 'sma' } );
	// chart.addIndicator( 'VolumeImpulse', 'row', { maLength: 14, maType: 'sma' } );
	chart.addIndicator( 'OBV', 'row' );
	// chart.addIndicator( 'MA', 'layer', { property: 'close', length: 50, type: 'ema', style: { color: '#ffff00'} } );
	chart.addIndicator( 'MA', 'layer', { property: 'close', length: 200, type: 'sma', style: { color: '#ff0000'} } );
	// chart.addIndicator( 'MA', 'layer', { property: 'close', length: 100, type: 'sma', style: { color: '#ffff00'} } );
	// chart.addIndicator( 'MA', 'layer', { property: 'close', length: 50, type: 'sma' } );
	// chart.addIndicator( 'MA', 'layer', { property: 'close', length: 21, type: 'sma' } );
	
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
