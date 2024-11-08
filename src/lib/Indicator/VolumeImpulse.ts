
import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type BarStyle, type LineStyle, type ShapeStyle, Setting, Settings } from './Base.ts';

//__ contract of constructor arg options
export type Options = {
	styleBars: BarStyle,
	maType: 'sma' | 'ema' | false,
	maLength: number,
	maStyle: LineStyle,
	flipMaLength: 7,
	flippedStyle: {
		up: ShapeStyle,
		down: ShapeStyle,
	},
}

//__ define the computed propertied used in computeSetup & draw
type Computed = {
	buyVol: number,
	buyVolEma: number,
	sellVol: number,
	sellVolEma: number,
	volDelta: number,
	volDeltaMa: number,
	cvdDelta: number,
	closeEma: number,
	flipped: number,
};

export default class VolumeImpulse extends Base<Options, Computed> {

	static name = 'Volume Impulse';

	settings: Settings<Options> = {
		maLength: new Setting( 'number', {
			label: 'MA length',
			min: 0,
			max: 200,
		} ),
	};

	constructor ( options: Partial<Options & BaseOptions> = {} ){

		const _options: Required<Options> & Partial<BaseOptions> = {// force constructor optional options to be set here
			maType: 'ema',
			maLength: 14,
			styleBars: {
				fillColor: '#444444',
			},
			maStyle: {
				color: '#ffffff66'
			},
			flipMaLength: 7,
			flippedStyle: {
				up: { fillColor: '#00d28d' },//'#00ff00',
				down: { fillColor: '#ff4040' },//'#ff0000',
			},
		};
		
		super( merge( _options, options ) );

		this.options.maLength = Math.max( 1, Math.round( this.options.maLength ) );
	}
	
	draw( index: number ){
		this.plotBar( 'volDelta', this.options.styleBars );
		if ( this.options.maType ){
			this.plot( 'volDeltaMa', this.options.maStyle );
		}
		if( this.options.flipMaLength ){
			const flipped = this.computed( index, 'flipped' );
			if( flipped ){
				this.plotDisc( 'cvdDelta', this.options.flippedStyle[ flipped > 0 ? 'up' : 'down' ] );
			}
		}
	}
	
	computeSetup(){
		/*__ credit to https://fr.tradingview.com/u/moluv/
				JS adaptation of his script "MW Volume Impulse" at https://fr.tradingview.com/script/c8A2cQb7-MW-Volume-Impulse/ */
		
		const mapBuySellVol: Map<number,{buy:number,sell:number}> = new Map();
		const buySellVol = ( index: number, prevValue?: number ) => {
			let bs = mapBuySellVol.get( index );
			if( !bs ){
				const close = this.computed( index, 'close' );
				if( !close ){
					return {
						buy: 0,
						sell: 0,
					}
				}
				const high = this.computed( index, 'high' );
				const open = this.computed( index, 'open' );
				const low = this.computed( index, 'low' );
				const vol = this.computed( index, 'volume' );
				const isUp = close >= open;
				const upperWick = isUp ? ( high - close ) : ( high - open );
				const lowerWick = isUp ? ( open - low ) : ( close - low );
				const spread = high - low;
				const body = spread - ( upperWick + lowerWick );
				const upperWickRatio = upperWick / spread;
				const lowerWickRatio = lowerWick / spread;
				const bodyRatio = body / spread;
				const vol1 = ( bodyRatio + ( upperWickRatio + lowerWickRatio ) / 2 ) * vol;
				const vol2 = ( upperWickRatio + lowerWickRatio ) / 2 * vol;
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
			buyVolEma: this.lib.ema('buyVol', this.options.maLength ),
			sellVol: ( index: number, prevValue?: number ) => buySellVol( index, prevValue ).sell,
			sellVolEma: this.lib.ema('sellVol', this.options.maLength ),
			volDelta: ( index: number, prevValue?: number ) => 
				this.computed( index, 'buyVolEma' ) - this.computed( index, 'sellVolEma' ),
			volDeltaMa: this.lib.ema('volDelta', this.options.maLength ),
			cvdDelta: ( index: number, prevValue?: number ) => 
				this.computed( index, 'volDelta' ) - this.computed( index, 'volDeltaMa' ),
			closeEma: this.lib.ema( 'close', this.options.flipMaLength ),
			// __ TODO: fix typescript accepting keys other than Computed keys
			flipped: ( index: number, prevValue?: number ) => {
				const cvdDelta = this.computed( index, 'cvdDelta' );
				const cvdDelta1 = this.computed( index, 'cvdDelta', 1 );
				const flippedUp = cvdDelta > 0 && cvdDelta1 < 0;
				let flippedDown = false;
				if( !flippedUp ){
					flippedDown = cvdDelta < 0 && cvdDelta1 > 0;
				}
				if( !flippedUp && !flippedDown ){
					return 0;
				}

				const close = this.computed( index, 'close' );
				const open1 = this.computed( index, 'open', 1 );
				const open2 = this.computed( index, 'open', 2 );

				if ( flippedUp && !( close > +open1 || close > open2 ) ){
					return 0;
				}
				if ( flippedDown && !( close < open1 || close < open2 ) ){
					return 0;
				}

				const closeEma = this.computed( index, 'closeEma' );
				if ( flippedUp && !( close > closeEma ) ){
					return 0;
				}
				if ( flippedDown && !( close < closeEma ) ){
					return 0;
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

