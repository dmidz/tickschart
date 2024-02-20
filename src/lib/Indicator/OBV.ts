
import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type LineStyle } from './Base.ts';

//__ contract of constructor arg options
export type Options = {
	style?: LineStyle,
}

//__ would never be used, its purpose is to define properties set in computeSetup
//__ and make sure to operate on valid object and so avoid a lot of checks
const defaultComputed = {
	obv: 0,
};

type Computed = typeof defaultComputed;

export default class OBV extends Base<Required<Options>, Computed> {

	constructor ( options: Options & Partial<BaseOptions> = {} ){

		//__ force optional constructor options to be set here 
		const _options: ReverseRequired<Options> = {
			style: {
				color: '#0080c5'
			},
		};
		
		super( defaultComputed, merge( _options, options ) );
	}
	
	draw(){
		this.plot( 'obv', this.options.style );
	}
	
	computeSetup(){
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

