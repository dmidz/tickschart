
import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type LineStyle } from './Base.ts';

//__ contract of constructor arg options
export type Options = {
	style?: LineStyle,
	styleDivergence?: {
		bull: LineStyle,
		bear: LineStyle,
	},
}

//__ would never be used, its purpose is to define properties set in computeSetup
//__ and make sure to operate on valid object and so avoid a lot of checks
const defaultComputed = {
	obv: 0,
};

type Computed = typeof defaultComputed;


const MIN_LOWHIGH_DELTA = 20;

export default class OBV extends Base<Required<Options>, Computed> {

	constructor ( options: Options & Partial<BaseOptions> = {} ){

		const _options: ReverseRequired<Options> = {// force constructor optional options to be set here
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
		};
		
		super( defaultComputed, merge( _options, options ) );
	}

	draw( index: number ){
		this.plot( 'obv', this.options.style );

		if ( index === this.highest.index ){
			const value = this.computed( this.highest.index, 'high' );
			const value2 = this.computed( this.highest2.index, 'high' );
			if ( value < value2 ){
				this.drawLine( { x: this.highest2.index, y: this.highest2.value },
					{ x: this.highest.index, y: this.highest.value },
					this.options.styleDivergence.bear );
			}
		}
		if ( index === this.lowest.index ){
			const value = this.computed( this.lowest.index, 'low' );
			const value2 = this.computed( this.lowest2.index, 'low' );
			if ( value > value2 ){
				this.drawLine( { x: this.lowest2.index, y: this.lowest2.value },
					{ x: this.lowest.index, y: this.lowest.value },
					this.options.styleDivergence.bull );
			}
		}
	}
	
	private highest = { index: 0, value: 0 };
	private highest2 = { index: 0, value: 0 };
	private lowest = { index: 0, value: 0 };
	private lowest2 = { index: 0, value: 0 };

	computeSetup(){
		this.highest = { index: 0, value: -Infinity };
		this.highest2 = { index: 0, value: -Infinity };
		this.lowest = { index: 0, value: Infinity };
		this.lowest2 = { index: 0, value: Infinity };

		//__ find 2 highs & lows 
		if( this.xMin && this.xMax ){
			let index = this.xMin;
			while( index <= this.xMax ){
				const value = this.computed( index, 'obv' );
				if( value > this.highest.value ){
					this.highest.value = value;
					this.highest.index = index;
				}else if( value < this.lowest.value ){
					this.lowest.value = value;
					this.lowest.index = index;
				}
				index += this.tickStep;
			}

			index = this.highest.index + this.tickStep * MIN_LOWHIGH_DELTA;
			while ( index <= this.xMax ){
				const value = this.computed( index, 'obv' );
				if ( value > this.highest2.value ){
					this.highest2.value = value;
					this.highest2.index = index;
				}
				index += this.tickStep;
			}
			index = this.lowest.index + this.tickStep * MIN_LOWHIGH_DELTA;
			while ( index <= this.xMax ){
				const value = this.computed( index, 'obv' );
				if ( value < this.lowest2.value ){
					this.lowest2.value = value;
					this.lowest2.index = index;
				}
				index += this.tickStep;
			}
			
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

