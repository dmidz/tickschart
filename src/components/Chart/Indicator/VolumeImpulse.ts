
import Base, { type BaseOptions, type BarStyle, type LineStyle } from './Base';
import type { CandleTick as Tick } from '@/components/Chart/_shared';

//______
export type Options = Partial<BaseOptions> & {
	emaLength: number,
	flipEmaLength: number,
	styleBars: BarStyle,
	styleMa: LineStyle,
	styleFlipped: { 
		up: LineStyle,
		down: LineStyle,
	},
}

const defaultCompute = {
	// buyVol: 0,
	// sellVol: 0,
	buySellVol: [0,0],
	buyVolEma: 0,
	sellVolEma: 0,
	volDelta: 0,
	volDeltaEma: 0,
	// cvdDelta: 0,
	// flippedUp: false,
	// flippedDown: false,
	// flippedUpMa: false,
	// flippedDownMa: false,
};

type Computed = typeof defaultCompute;

export default class VolumeImpulse extends Base<Options,Computed> {

	constructor ( key: Base['key'], options: Partial<Options> = {} ){
		super( key, defaultCompute,
			/*//_____ credit to https://fr.tradingview.com/u/moluv/
			//	this is a JS adaptation of his script "MW Volume Impulse" at https://fr.tradingview.com/script/c8A2cQb7-MW-Volume-Impulse/
			*/
			//__ TODO: getPath( obj, 'path.to.prop') 
			//__ TODO: back to compute object of funcs instead func 
			( prop, tick, index ) => {
				switch ( prop ){
					case 'buySellVol': {
						const isUp = +tick.close >= +tick.open;
						const upperWick = isUp ? ( +tick.high - +tick.close ) : ( +tick.high - +tick.open );
						const lowerWick = isUp ? ( +tick.open - +tick.low ) : ( +tick.close - +tick.low );
						const spread = +tick.high - +tick.low;
						const body = spread - ( upperWick + lowerWick );
						const upperWickRatio = upperWick / spread;
						const lowerWickRatio = lowerWick / spread;
						const bodyRatio = body / spread;
						const vol1 = ( bodyRatio + ( upperWickRatio + lowerWickRatio ) / 2 ) * +tick.vol;
						const vol2 = ( upperWickRatio + lowerWickRatio ) / 2 * +tick.vol;
						console.log('buySellVol', vol1, vol2);
						return {
							buy: isUp ? vol1 : vol2,
							sell: isUp ? vol2 : vol1,
						}
						// return [ isUp ? vol1 : vol2, isUp ? vol2 : vol1];
					}
					case 'buyVolEma':{
						console.log( 'buyVolEma' );
						return super.ema( 'buySellVol.buy', this.options.emaLength );
					}
					case 'sellVolEma': {
						console.log( 'sellVolEma' );
						return super.ema('buySellVol.sell', this.options.emaLength );
					}
					case 'volDelta': {
						console.log( 'volDelta' );
						return super.computedValueNumber(index, 'buyVolEma') - super.computedValueNumber(index, 'sellVolEma' );
					}
					// case 'volDeltaEma': {
					// 	return super.ema('volDelta', this.options.emaLength );
					// }
				}
			},
			/*
						{
							// [ 'buyVolEma', () => {
							// 	if ( !this.options.maProp ){
							// 		return 0;
							// 	}
							// 	return super.sma( 'ma', this.options.maLength );
							// } ],
							volDelta: ( index ) => {
								const cvn = this.computedValueNumber;
								const isUp = cvn( index, 'close' ) >= cvn( index, 'open' );
								const upperWick = isUp ? ( cvn( index, 'high' ) - cvn( index, 'close' ) ) : ( cvn( index, 'high' ) - cvn( index, 'open' ) );
								const lowerWick = isUp ? ( cvn( index, 'open' ) - cvn( index, 'low' ) ) : ( cvn( index, 'close' ) - cvn( index, 'low' ) );
								const spread = cvn( index, 'high' ) - cvn( index, 'low' );
								const body = spread - ( upperWick + lowerWick );
								const upperWickRatio = upperWick / spread;
								const lowerWickRatio = lowerWick / spread;
								const bodyRatio = body / spread;
								const vol1 = ( bodyRatio + ( upperWickRatio + lowerWickRatio ) / 2 ) * cvn( index, 'vol' );
								const vol2 = ( upperWickRatio + lowerWickRatio ) / 2 * cvn( index, 'vol' );
								const buyVol = isUp ? vol1 : vol2;
								const sellVol = isUp ? vol2 : vol1;
								// const buyVolEma = super.ema( compute, 'buyVol', this.options.emaLength );
								// compute.sellVolEma = super.ema( compute, 'sellVol', this.options.emaLength );
								// return compute.buyVolEma - compute.sellVolEma;
							},
							volDeltaEma: ( index ) => {
								return super.ema( 'volDelta', this.options.emaLength );
							},
							// ] ),
						},
			*/
			( drawCtxt, index ) => {
			// console.log('___ draw', computed.time );
			drawCtxt.plotBar( 'volDelta', this.options.styleBars );
			// drawCtxt.plot( 'volDeltaEma', this.options.styleMa );
			
			// if( this.computed.flippedUpMa ){
			// 	super.plotCircle( 'cvdDelta', this.options.styleFlipped.up );
			// }else if( this.computed.flippedDownMa ){
			// 	super.plotCircle( 'cvdDelta', this.options.styleFlipped.down );
			// }
		}, {
			emaLength: 14,
			flipEmaLength: 7,
			styleBars: {
				fillColor: '#444444',
			},
			styleMa: {
				color: '#409eff',//'#00d28d'
			},
			styleFlipped: {
				up: { color: '#ffffff' },//'#00ff00',
				down: { color: '#409eff' },//'#ff0000',
			},
			...options,
		} );
	}

	getMinY( tick: Tick, index: number ): number {
		return this.computedValue( index, 'volDelta' );
	}

	getMaxY( tick: Tick, index: number ): number {
		return this.computedValue( index, 'volDelta' );
	}

	// minMaxY( index: number ): MinMax {
	// 	const v = this.computedValue( index, 'volDelta' );
	// 	return { min: v, max: v };
	// }

	/* ALGO Idea
		- detect vol anomaly ( vol > volSMA * k1 ) & price volatility ( move > volatSMA * k2 )
		- followed by price stabilisation
		- followed by price reverse volatility with high vol ( move > volatSMA * k3 )
	*/

	__draw(){
		// super.plotBar( 'volDelta', this.options.styleBars );
		// super.plot( 'volDeltaEma', this.options.styleMa );

		// if( this.computed.flippedUpMa ){
		// 	super.plotCircle( 'cvdDelta', this.options.styleFlipped.up );
		// }else if( this.computed.flippedDownMa ){
		// 	super.plotCircle( 'cvdDelta', this.options.styleFlipped.down );
		// }
	}

/*
	protected compute( compute: Tick & Computed ) {
		// super.debug(`${this._escape?'':'___ '}compute`, compute.time, new Date( compute.time ).toUTCString() );
		/!*!//_____ credit to https://fr.tradingview.com/u/moluv/
		//	this is a JS adaptation of his script "MW Volume Impulse" at https://fr.tradingview.com/script/c8A2cQb7-MW-Volume-Impulse/
		*!/
		const isUp = +compute.close >= +compute.open;
		const upperWick = isUp ? ( +compute.high - +compute.close ) : ( +compute.high - +compute.open );
		const lowerWick = isUp ? ( +compute.open - +compute.low ) : ( +compute.close - +compute.low );
		const spread = +compute.high - +compute.low;
		const body = spread - ( upperWick + lowerWick );
		const upperWickRatio = upperWick / spread;
		const lowerWickRatio = lowerWick / spread;
		const bodyRatio = body / spread;
		const vol1 = ( bodyRatio + ( upperWickRatio + lowerWickRatio ) / 2 ) * +compute.vol;
		const vol2 = ( upperWickRatio + lowerWickRatio ) / 2 * +compute.vol;
		compute.buyVol = isUp ? vol1 : vol2;
		compute.sellVol = isUp ? vol2 : vol1;
		compute.buyVolEma = super.ema( compute, 'buyVol', this.options.emaLength );
		compute.sellVolEma = super.ema( compute, 'sellVol', this.options.emaLength );
		compute.volDelta = compute.buyVolEma - compute.sellVolEma;
		compute.volDeltaEma = super.ema( compute, 'volDelta', this.options.emaLength );

		// compute.cvdDelta = compute.volDelta - compute.volDeltaEma;
		// const prev1 = super.cacheGet( compute.time, 1 );
		// const cvdDelta1 = super.orNumber( prev1?.cvdDelta );
		// const flippedUp = compute.cvdDelta > 0 && cvdDelta1 < 0;
		// const flippedDown = compute.cvdDelta < 0 && cvdDelta1 > 0;
		// const closeEma = super.ema( compute, 'close', this.options.flipEmaLength );
		// const prev2 = super.cacheGet( compute.time, 2 );
		// compute.flippedUpMa = flippedUp && +compute.close > closeEma && ( +compute.close > prev1?.open || +compute.close > prev2?.close );
		// compute.flippedDownMa = flippedDown && +compute.close < closeEma && ( +compute.close < prev1?.open || +compute.close < prev2?.close );

		// if ( !this.dirty /!*compute.time === 1696795200000*!/ ){
		// 	// console.log( '### volDelta', compute.time, compute.buyVolEma, compute.sellVolEma );
		// }

	}
*/

}

/* TradingView script at https://fr.tradingview.com/script/c8A2cQb7-MW-Volume-Impulse/

upperWick = close > open ? high - close : high - open
lowerWick = close > open ? open - low : close - low
spread = high - low
bodyLength = spread - (upperWick + lowerWick)

percentUpperWick = upperWick / spread
percentLowerWick = lowerWick / spread
percentBodyLength = bodyLength / spread

buyingVolume = close > open ? (percentBodyLength + (percentUpperWick + percentLowerWick) / 2) * volume : (percentUpperWick + percentLowerWick) / 2 * volume
sellingVolume = close < open ? (percentBodyLength + (percentUpperWick + percentLowerWick) / 2) * volume : (percentUpperWick + percentLowerWick) / 2 * volume

// buyingVolume = close > open ? (percentBodyLength + (percentUpperWick + percentLowerWick) / 2) * volume : (percentUpperWick + percentLowerWick) / 2 * volume
// sellingVolume = close > open ? (percentUpperWick + percentLowerWick) / 2 * volume : (percentBodyLength + (percentUpperWick + percentLowerWick) / 2) * volume

accumulationLength = input(14)
cumulativeBuyingVolume = ta.ema(buyingVolume, accumulationLength)
cumulativeSellingVolume = ta.ema(sellingVolume, accumulationLength)
cumulativeVolumeDelta = cumulativeBuyingVolume - cumulativeSellingVolume

flippedUp(_series,_period=1) =>
     _series > 0 and _series[_period] < 0

flippedDown(_series,_period=1) =>
     _series < 0 and _series[_period] > 0

cvdMaDifference = cumulativeVolumeDelta - ta.ema(cumulativeVolumeDelta,i_period)
cvdMaDiffFlipUp = flippedUp(cvdMaDifference)
cvdMaDiffFlipDown = flippedDown(cvdMaDifference)

flipUpPlusMA = cvdMaDiffFlipUp and close > ta.ema(close,7) and (close > open[1] or close > open[2])
flipDownPlusMA = cvdMaDiffFlipDown and close < ta.ema(close,7) and (close < open[1] or close < open[2])

plot(cumulativeVolumeDelta, color = cumulativeVolumeDelta > 0 ? color.green : color.red, style=plot.style_columns)
plot(ta.ema(cumulativeVolumeDelta,i_period), color=color.new(color.white,0))

plot(flipUpPlusMA ? cvdMaDifference : na, color = flipUpPlusMA ? color.new(color.green, i_dotTransparency) : na, style=plot.style_circles, linewidth=i_dotSize)
plot(flipDownPlusMA ? cvdMaDifference : na, color = flipDownPlusMA ? color.new(color.red, i_dotTransparency) : na, style=plot.style_circles, linewidth=i_dotSize)
plot(flipUpPlusMA ? cvdMaDifference : na, color = flipUpPlusMA ? color.new(color.white, i_dotTransparency) : na, style=plot.style_circles, linewidth=i_dotSize/2)
plot(flipDownPlusMA ? cvdMaDifference : na, color = flipDownPlusMA ? color.new(color.white, i_dotTransparency) : na, style=plot.style_circles, linewidth=i_dotSize/2)

*/
