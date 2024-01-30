<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, withDefaults } from 'vue';

import { intervalsMs } from '@/utils/date';
import { Chart, FetcherTicks, defaultTick, type CandleTick } from '@/components/Chart';

// import { storeToRefs } from 'pinia';
// import { ElDatePicker, ElButton } from 'element-plus';
// import { DArrowLeft } from '@element-plus/icons-vue';
// import 'element-plus/es/components/icon/style/css';
// import 'element-plus/es/components/date-picker/style/css';
// import { Player } from './Player';
// import useMarketHistory, { intervalsMs, type IntervalMs } from '@/stores/Exchange/useMarketHistory';
// import IconPlay from '@/assets/icons/material-play-arrow-outline-rounded.svg';
// import IconPause from '@/assets/icons/material-pause-outline-rounded.svg';
// import IconSkip from '@/assets/icons/material-skip-next-outline-rounded.svg';
// import IconChart from '@/assets/icons/uil-chart-down.svg';
// import useExchange from '@/stores/Exchange/useExchange';

type DataTick = Record<string, CandleTick>

//____
const props = withDefaults( defineProps<{
	symbol?: string;
}>(), {
	symbol: 'BTCUSDT',
} );

const { m1, h1, d1 } = intervalsMs;
const xOriginRatio = .75;
const timeScaleMs = h1 * 4;
const ticksPerLoad = 500;

//__
const currentTime = ref( new Date() );
// const currentTime = ref( new Date( Date.UTC( 2024, 1, 15 ) ) );
// const currentTime = ref( new Date( Date.UTC( 2023, 9, 10 ) ) );
const refChartWrapper = ref<HTMLElement>();
let chart: Chart;

const dateFormatCrossHair = new Intl.DateTimeFormat( undefined, {
	timeZone: 'UTC',
	weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
} );

const sampleTicksURL = `${ window.location.origin }/data/ticks_BTC_4h/1692000000000.json`;
let sampleTicks: DataTick | null = null;

const fetcher = new FetcherTicks<CandleTick, DataTick>( defaultTick, async ( startTime, limit ) => {
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
	// debug: true,
} );

const rangeLoadMs = ticksPerLoad * timeScaleMs;
onMounted( async () => {
	if( !refChartWrapper.value /*|| !refReplayToolbar.value*/ ){ return;}
	let init = false;//__ using to prevent fetching until chart fully initialized ( timeScale, symbol, etc )
	
	chart = new Chart( refChartWrapper.value, timeScaleMs, ( index: number ) => {
		/*__ one would normally pass fetcher.getTick directly, but for the only one file sample
					we can bypass it to always return a tick from the file ( 1692000000000 ) time range */
		if( index > Date.now() ){ return defaultTick;}
		return fetcher.getMapTicks( index )?.[ 1692000000000 + index % rangeLoadMs ] || defaultTick;
	}, {
		onScalingXChange: async ( scalingX ) => {
			if( !init ){  return;}//__ avoid any fetch during initialization
			if( scalingX.scaleIn.min > Date.now() ){  return;}//__ avoid fetch any date over now
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
	} );
	
	chart.addIndicator( 'Volume', 'vol-1', { maLength: 14 } );
	
	//__ apply current symbol & interval if any, without rendering
	// const k = props.symbol.split( assetQuote.value );
	// if ( k.length === 2 ){
	// 	handleChangeAssetBase( k[ 0 ], false );
	// }
	// handleChangeTimeScale( props.interval, false );

	//__ can now apply the initial time & render
	init = true;
	const timeStart = currentTime.value.getTime();
	chart.setX( timeStart, { render: true, xOriginRatio } );
	
	//__ player
	// player = new Player( chart, refReplayToolbar.value, {
	// 	onPlayPause: ( playing ) => {
	// 		isPlaying.value = playing;
	// 	},
	// 	// frameDuration: 3000,
	// } );

});

onBeforeUnmount( () => {
	chart?.beforeDestroy();
	// player?.beforeDestroy();
});


//__
// const emit = defineEmits( [ 'onChangeSymbol', 'onChangeInterval' ] );
// const refReplayToolbar = ref<HTMLElement>();
// let player: Player;
// const marketHistory = useMarketHistory();
// const { timeScale } = storeToRefs( marketHistory );
// const exchange = useExchange();
// const { quoteAssetSymbolsReq } = exchange;
// const assetQuote = ref<string>('USDT');
// const assetBase = ref<string>();
//
// watch([() => assetQuote.value], () => {
// 	if( !assetQuote.value ){  return;}
// 	quoteAssetSymbolsReq.execute( {
// 		query: {
// 			assetQuote: assetQuote.value,
// 		}
// 	} );
// }, { immediate: true });
//
// function handleChangeAssetBase( value: string, refresh = true ){
// 	assetBase.value = value;
// 	const symbol = `${ assetBase.value }${ assetQuote.value }`;
// 	marketHistory.setSymbol( symbol, true );
// 	if( refresh ){
// 		chart.refresh();
// 	}
// 	emit( 'onChangeSymbol', symbol );
// }
//__ timeScale
// const intervalOptions = Object.keys( intervalsMs ).map( key => ( {
// 	value: key,
// 	label: key
// }) );
// function handleChangeTimeScale( value: IntervalMs, refresh = true ){
// 	const timeScaleMs = marketHistory.setTimeScale( value, true );
// 	if( timeScaleMs ){
// 		chart.setTickStep( timeScaleMs, { render: refresh, xOriginRatio } );
// 		emit( 'onChangeInterval', value );
// 	}
// }
// function onDateChange( value: Date ){
// 	// console.log('onDateChange', value );
// 	if ( !value ){
// 		return;
// 	}
// 	chart.setX( value.getTime(), { render: true, xOriginRatio } );
// }
//__ player
// const replayMode = ref( false );
//
// function setReplayMode( mode: boolean | 'toggle' ){
// 	replayMode.value = mode === 'toggle' ? !replayMode.value : mode;
// 	if( replayMode.value ){
// 		player.startSession();
// 	}else{
// 		player.endSession();
// 	}
// }
//
// const isPlaying = ref( false );

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
