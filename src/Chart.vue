<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

import { Chart, Fetcher, defaultTick, intervalsMs, type CandleTick } from '@/lib';

type DataTick = Record<string, CandleTick>

//____
const { m1, h1, d1 } = intervalsMs;
const timeScaleMs = h1 * 4;
const ticksPerLoad = 500;
const xOriginRatio = .75;
const currentTime = ref( new Date() );
// const currentTime = ref( new Date( Date.UTC( 2024, 1, 15 ) ) );
// const currentTime = ref( new Date( Date.UTC( 2023, 8,29 ) ) );
// const currentTime = ref( new Date( Date.UTC( 2023, 9, 10 ) ) );

const refChartWrapper = ref<HTMLElement>();
const dateFormatCrossHair = new Intl.DateTimeFormat( undefined, {
	timeZone: 'UTC',
	weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
} );

const sampleTicksURL = `${ window.location.origin }/data/ticks_BTC_4h/1692000000000.json`;
let sampleTicks: DataTick | null = null;

let chart: Chart;

const fetcher = new Fetcher<CandleTick, DataTick>( defaultTick, async ( startTime, limit ) => {
	/*__ this example uses a unique local json file ( 500 ticks ) served in dev mode, replace this by an API call
	 with passed params such startTime & limit + other such symbol & timeScale string ( 15m / 4h / d1... ) */

	if( sampleTicks ){ return sampleTicks;}

	const url = new URL( sampleTicksURL );
	
	url.search = new URLSearchParams( {// sample of params for API, useless here with local json fetch 
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
	
	chart = new Chart( refChartWrapper.value, timeScaleMs, ( index: number ) => {
		/*__ one would normally pass fetcher.getTick directly, but for the only one file sample
					we can bypass it to always return a tick from the file ( 1692000000000 ) time range */
		return fetcher.getMapTicks( index )?.[ 1692000000000 + index % rangeLoadMs ] || defaultTick;
	}, {
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
	
	// chart.addIndicator( 'Volume', 'row', { maProperty: 'vol', maLength: 14, maType: 'sma' } );
	chart.addIndicator( 'VolumeImpulse', 'row', { maLength: 14, maType: 'sma' } );
	// chart.addIndicator( 'MA', 'layer', { property: 'close', length: 200, type: 'sma', style: { color: '#ff0000'} } );
	// chart.addIndicator( 'MA', 'layer', { property: 'close', length: 100, type: 'sma', style: { color: '#ffff00'} } );
	// chart.addIndicator( 'MA', 'layer', { property: 'close', length: 50, type: 'sma' } );
	chart.addIndicator( 'MA', 'layer', { property: 'close', length: 21, type: 'sma' } );
	
	//__ can now apply the initial time & render
	init = true;
	chart.setX( currentTime.value.getTime(), { render: true, xOriginRatio } );
	
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
.chart {
	flex: 1 1;
	background-color: #191919;
	border: 1px solid #333333;
	color: #cccccc;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	position: relative;

	/*__ override :focus-visible ( keyboard focus ) */
	:deep(*) {
		&:focus-visible {
			outline: none;
			position: relative;
			&:after {
				content: "";
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				bottom: 0;
				border: 1px solid #999999;
				z-index: 100;
			}

		}
	}
}

</style>
