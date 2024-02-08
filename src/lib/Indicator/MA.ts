
import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type LineStyle } from './Base.ts';

//______
export type Options = {
	maProperty: Parameters<Base<BaseOptions, Computed>['computed']>[1],
	maType?: 'sma' | 'ema',
	maLength?: number,
	styleMa?: LineStyle,
}

//__ would not be used, its purpose is to define properties used by drawing & set in computeSetup
//__ and make sure to operate on valid object and so avoid lots of checks
const defaultComputed = {
	ma: 0,
};

type Computed = typeof defaultComputed;

export default class MA extends Base<Required<Options>, Computed> {

	constructor ( options: Options & Partial<BaseOptions> ){
		
		const _options: Required<PickOptional<Options>> = {
			maType: 'sma',
			maLength: 10,
			styleMa: {
				color: '#0080c5'
			},
		};
		
		super( defaultComputed, merge( _options, options ) );

		this.options.maLength = Math.max( 1, Math.round( this.options.maLength ) );
	}
	
	draw(){
		//__ sma / ema
		this.plot( 'ma', this.options.styleMa );
	}
	
	computeSetup(){
		return {
			ma: this.lib[this.options.maType||'sma']( this.options.maProperty, this.options.maLength, true ),
		};
	}
	
	getMinY( index: number ): number {
		return 0;
	}

	getMaxY( index: number ): number {
		return this.computed( index, this.options.maProperty );
	}
}

