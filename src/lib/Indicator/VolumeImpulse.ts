
import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type BarStyle, type LineStyle } from './Base.ts';

//__ contract of constructor arg options
export type Options = {
	styleBars?: BarStyle,
	maType?: 'sma' | 'ema' | false,
	maLength?: number,
	maStyle?: LineStyle,
	flipped?: boolean,
	flipMaLength?: 7,
	flippedStyle?: {
		up: LineStyle,
		down: LineStyle,
	},
}

//__ would never be used, its purpose is to define properties set in computeSetup
//__ and make sure to operate on valid object and so avoid a lot of checks
const defaultComputed = {
	buyVol: 0,
	buyVolEma: 0,
	sellVol: 0,
	sellVolEma: 0,
	volDelta: 0,
	volDeltaMa: 0,
	cvdDelta: 0,
	closeEma: 0,
	flipped: 0,
};

type Computed = typeof defaultComputed;

export default class Volume extends Base<Required<Options>, Computed> {

	constructor ( options: Options & Partial<BaseOptions> ){

		/*__ force optional constructor options to be set here */
		const _options: ReverseRequired<Options> = {
			maType: 'ema',
			maLength: 14,
			styleBars: {
				fillColor: '#444444',
			},
			maStyle: {
				color: '#ffffff'
			},
			flipped: true,
			flipMaLength: 7,
			flippedStyle: {
				up: { color: '#4dffc3' },//'#00ff00',
				down: { color: '#ff00cb' },//'#ff0000',
			},
		};
		
		super( defaultComputed, merge( _options, options ) );

		this.options.maLength = Math.max( 1, Math.round( this.options.maLength ) );
	}
	
	draw( index: number ){
		this.plotBar( 'volDelta', this.options.styleBars );
		if ( this.options.maType ){
			this.plot( 'volDeltaMa', this.options.maStyle );
		}
		if( this.options.flipped ){
			const flipped = this.computed( index, 'flipped' );
			if( flipped ){
				this.plotCircle( 'cvdDelta', this.options.flippedStyle[ flipped > 0 ? 'up' : 'down' ] );
			}
		}
	}
	
	computeSetup(){
		/*__ credit to https://fr.tradingview.com/u/moluv/
				this is a JS adaptation of his script "MW Volume Impulse" at https://fr.tradingview.com/script/c8A2cQb7-MW-Volume-Impulse/ */
		const mapBuySellVol: Map<number,{buy:number,sell:number}> = new Map();
		const buySellVol = ( index: number, prevValue?: number ) => {
			let bs = mapBuySellVol.get( index );
			if( !bs ){
				const tick = this.getTick( index );
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
				bs = {
					buy: isUp ? vol1 : vol2,
					sell: isUp ? vol2 : vol1,
				}
				mapBuySellVol.set( index, bs );
			}
			return bs;
		}
		
		return {
			buyVol: ( index: number, prevValue?: number ) => buySellVol( index, prevValue ).buy,
			buyVolEma: this.lib.ema('buyVol', 14 ),
			sellVol: ( index: number, prevValue?: number ) => buySellVol( index, prevValue ).sell,
			sellVolEma: this.lib.ema('sellVol', 14 ),
			volDelta: ( index: number, prevValue?: number ) =>
				this.computed( index, 'buyVolEma' ) - this.computed( index, 'sellVolEma' ),
			volDeltaMa: this.lib.ema('volDelta', this.options.maLength ),
			cvdDelta: ( index: number, prevValue?: number ) => 
				this.computed( index, 'volDelta' ) - this.computed( index, 'volDeltaMa' ),
			closeEma: this.lib.ema( 'close', this.options.flipMaLength ),
			// __ TODO: fix typescript accepting keys other than Computed keys
			flipped: ( index: number, prevValue?: number ) => {
				const cvdDelta = this.computed( index, 'cvdDelta' );
				// console.log( 'cvd delta', cvdDelta );
				const cvdDelta1 = this.computed( index, 'cvdDelta', 1 );
				const flippedUp = cvdDelta > 0 && cvdDelta1 < 0;
				let flippedDown = false;
				if( !flippedUp ){
					flippedDown = cvdDelta < 0 && cvdDelta1 > 0;
				}
				if( !flippedUp && !flippedDown ){
					return 0;
				}
				
				if( this.options.flipMaLength ){
					const tick = this.getTick( index );
					const tick1 = this.getTick( index, 1 );
					const tick2 = this.getTick( index, 2 );

					if( flippedUp && !( +tick.close > +tick1.open || +tick.close > +tick2.open ) ){	return 0;}
					if ( flippedDown && !( +tick.close < +tick1.open || +tick.close < +tick2.open ) ){ return 0;}
					
					const closeEma = this.computed( index, 'closeEma' );
					if( flippedUp && !( +tick.close > closeEma ) ){ return 0;}
					if( flippedDown && !( +tick.close < closeEma ) ){ return 0;}

				}
				return cvdDelta;
			},
		};
	}
	
	getMinY( index: number ): number {
		return this.computed( index, 'volDelta' );
	}

	getMaxY( index: number ): number {
		return this.computed( index, 'volDelta' );
	}
}

