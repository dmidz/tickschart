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

const emit = defineEmits( [ 'onChangeSymbol','onChangeInterval' ] );

//__
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
const { m1, h1, d1 } = intervalsMs;
const xOriginRatio = .75;
const timeScaleMs = h1 * 4;

// function handleChangeTimeScale( value: IntervalMs, refresh = true ){
// 	const timeScaleMs = marketHistory.setTimeScale( value, true );
// 	if( timeScaleMs ){
// 		chart.setTickStep( timeScaleMs, { render: refresh, xOriginRatio } );
// 		emit( 'onChangeInterval', value );
// 	}
// }

//__
// const currentTime = ref( new Date( Date.now() ) );
const currentTime = ref( new Date( Date.UTC( 2023, 10, 18 ) ) );
// const currentTime = ref( new Date( Date.UTC( 2022, 9, 3, 0, 0, 0, 0 ) ) );
const refChartWrapper = ref<HTMLElement>();
const refReplayToolbar = ref<HTMLElement>();
let chart: Chart;
// let player: Player;

const dateFormat = new Intl.DateTimeFormat( undefined, { timeZone: 'UTC' } );

const dateFormatCrossHair = new Intl.DateTimeFormat( undefined, {
	timeZone: 'UTC',
	weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
} );

const fetcher = new FetcherTicks<CandleTick, DataTick>( defaultTick, ( startTime, limit ) => {
	// if ( !symbol.value ){
	// 	return Promise.reject( 'symbol is required.' );
	// }
	// if ( !timeScale.value ){
	// 	return Promise.reject( 'timeScale is required.' );
	// }
	
	return Promise.resolve( {});
	// return ticksReq.execute( {
	// 	query: {
	// 		symbol: symbol.value,
	// 		interval: timeScale.value,
	// 		startTime: `${ startTime }`,
	// 		limit: `${ limit }`,
	// 	},
	// } );
}, {
	timeScaleMs,
	ticksPerLoad: 500,
	prefetchMargin: 1,
	cacheSize: 2,
} );

onMounted( async () => {
	if( !refChartWrapper.value /*|| !refReplayToolbar.value*/ ){ return;}
	let init = false;//__ using to prevent fetching until chart fully initialized ( timeScale, symbol, etc )
	
	chart = new Chart( refChartWrapper.value, timeScaleMs, fetcher.getTick, {
		// tickWidth: 35,
		onScalingXChange: async ( scalingX ) => {
			// console.log( '_onScalingXChange', marketHistory.symbol );
			if( !init ){  return;}
			// console.log('onScalingXChange', dateFormatCrossHair.format( new Date( scalingX.scaleIn.min ) ) );
			// const fetches = marketHistory.fetchTicks( scalingX.scaleIn.min, scalingX.scaleIn.max );
			// return Promise.all( fetches );
		},
		crossHairLabelX: ( value ) => {
			const d = new Date( value );
			return `${dateFormatCrossHair.format( d )} (UTC)`;
		},
		uiScaleX: {
			stepsRange: [ m1, m1 * 5, m1 * 10, m1 * 15, m1 * 30, h1, h1 * 1.5, h1 * 3, h1 * 6, h1 * 12, d1 ],
			formatLabel: ( value: number, precision?: number ): string => {
				const d = new Date( value );
				if ( !( value % d1 ) ){
					return `${ d.getUTCDate() }`;
				}
				return `${ d.getUTCHours() }:${ `${d.getUTCMinutes()}`.padStart( 2, '0' ) }`;
			},
		},
		scaleY: {
			precisionIn: .001,//__ TODO: should be set from symbol infos
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

// function onDateChange( value: Date ){
// 	// console.log('onDateChange', value );
// 	if ( !value ){
// 		return;
// 	}
// 	chart.setX( value.getTime(), { render: true, xOriginRatio } );
// }

//__ player
/*
const replayMode = ref( false );

function setReplayMode( mode: boolean | 'toggle' ){
	replayMode.value = mode === 'toggle' ? !replayMode.value : mode;
	if( replayMode.value ){
		player.startSession();
	}else{
		player.endSession();
	}
}

const isPlaying = ref( false );
*/

</script>

<template>
<div class="chart" ref="refChartWrapper">
</div>
</template>

<style lang="scss" scoped>
.chart {
	flex: 1 1;
	color: #ddd;
	background-color: #242424;
	border: 1px solid #333333;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	position: relative;
}

</style>
