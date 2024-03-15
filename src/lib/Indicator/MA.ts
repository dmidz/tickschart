
import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type LineStyle } from './Base.ts';

//______
export type Options = {
	property: Parameters<Base<BaseOptions, Computed>['computed']>[1],
	type?: 'sma' | 'ema',
	length?: number,
	style?: LineStyle,
}

//__ would not be used, its purpose is to define properties used by drawing & set in computeSetup
//__ and make sure to operate on valid object and so avoid lots of checks
const defaultComputed = {
	ma: 0,
};

type Computed = typeof defaultComputed;

export default class MA extends Base<Required<Options>, Computed> {

	constructor ( options: Options & Partial<BaseOptions> ){
		
		const _options: ReverseRequired<Options> = {
			type: 'sma',
			length: 10,
			style: {
				color: '#40e9ff'
			},
		};
		
		super( defaultComputed, merge( _options, options ) );

		this.options.length = Math.max( 1, Math.round( this.options.length ) );
	}
	
	draw(){
		//__ sma / ema
		this.plot( 'ma', this.options.style );
	}
	
	computeSetup(){
		return {
			ma: this.lib[this.options.type]( this.options.property, this.options.length ),
		};
	}
	
	getMinY( index: number ): number {
		return 0;
	}

	getMaxY( index: number ): number {
		return this.computed( index, this.options.property );
	}
}

