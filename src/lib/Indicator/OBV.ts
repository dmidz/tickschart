
import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type LineStyle, type ShapeStyle } from './Base.ts';
import { type LowHigh } from './index.ts';

//__ contract of constructor arg options
export type Options = {
	lowsHighsConfirmDelta?: number,
	style?: LineStyle,
	styleDivergence?: {
		bull: LineStyle,
		bear: LineStyle,
	},
	styleDot?: { 
		low: ShapeStyle,
		high: ShapeStyle,
	},
}

//__ would never be used, its purpose is to define properties set in computeSetup
//__ and make sure to operate on valid object and so avoid a lot of checks
const defaultComputed = {
	obv: 0,
};

type Computed = typeof defaultComputed;

export default class OBV extends Base<Required<Options>, Computed> {

	constructor ( options: Options & Partial<BaseOptions> = {} ){

		const _options: ReverseRequired<Options> = {// force constructor optional options to be set here
			lowsHighsConfirmDelta: 25,
			style: {
				color: '#0080c5'
			},
			styleDivergence: {
				bear: {
					color: '#ff4040'
				},
				bull: {
					color: '#4dffc3'
				},
			},
			styleDot: {
				low: {
					fillColor: '#ffffff',
				},
				high: {
					fillColor: '#4dffc3',
				},
			}
		};
		
		super( defaultComputed, merge( _options, options ) );
	}

	draw( index: number ){
		this.plot( 'obv', this.options.style );

		const high = this.lowsHighs.highs.get( index );
		if ( high ){
			this.plotDisc( high.value, this.options.styleDot.high );
			if ( high.next ){
				const value = this.computed( high.index, 'high' );
				const value2 = this.computed( high.next.index, 'high' );
				if ( value < value2 ){
					this.drawLine( { x: high.index, y: high.value },
						{ x: high.next.index, y: high.next.value },
						this.options.styleDivergence.bear );
				}
			}
		}

		const low = this.lowsHighs.lows.get( index );
		if ( low ){
			this.plotDisc( low.value, this.options.styleDot.low );
			if ( low.next ){
				const value = this.computed( low.index, 'low' );
				const value2 = this.computed( low.next.index, 'low' );
				if ( value > value2 ){
					this.drawLine( { x: low.index, y: low.value },
						{ x: low.next.index, y: low.next.value },
						this.options.styleDivergence.bull );
				}
			}
		}
	}
	
	private lowsHighs: {
		lows: Map<number, LowHigh>,
		highs: Map<number, LowHigh>,
	} = {
		lows: new Map(),
		highs: new Map(),
	};

	computeSetup(){
		if( this.xMin && this.xMax ){
			this.lowsHighs = this.getLowsHighs( 'obv', this.options.lowsHighsConfirmDelta );
			// console.log('lows highs', this.lows, this.highs );
		}
		
		return {
			obv: ( index: number, prevValue?: number ) => {
				if( prevValue === undefined ){ return 0;}
				let res = prevValue;
				const vol = this.computed( index, 'volume' );
				const close = this.computed( index, 'close' );
				const close1 = this.computed( index, 'close', 1 );
				if( close > close1 ){
					res += vol;
				}else if( close < close1 ){
					res -= vol;
				}
				return res;
			},
		};
	}
	
	getMinY( index: number ): number {
		return this.computed( index, 'obv' );
	}

	getMaxY( index: number ): number {
		return this.computed( index, 'obv' );
	}
}

