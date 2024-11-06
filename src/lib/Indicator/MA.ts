
import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type LineStyle, DisplayMode } from './Base.ts';

//______
export type Options = {
	property: Parameters<Base<BaseOptions, Computed>['computed']>[1],
	type: 'sma' | 'ema',
	length: number,
	style: LineStyle,
}

//__ define the computed propertied used in computeSetup & draw
type Computed = {
	ma: number
};

export default class MA extends Base<Options, Computed> {

	static label = 'SMA / EMA';
	
	displayMode: DisplayMode = 'layer';
	
	constructor ( options: Partial<Options & BaseOptions> = {} ){
		
		const _options: Required<Options> & Partial<BaseOptions> = {// force set default options
			property: 'close',
			type: 'sma',
			length: 50,
			style: {
				color: '#ffff00'
			},
		};
		
		super( merge( _options, options ) );

		this.options.length = Math.max( 1, Math.round( this.options.length ) );
	}

	computeSetup (){
		return {
			ma: this.lib[ this.options.type ]( this.options.property, this.options.length ),
		}
	}

	draw(){
		//__ sma / ema
		this.plot( 'ma', this.options.style );
	}
	
	getMinY( index: number ): number {
		return 0;
	}

	getMaxY( index: number ): number {
		return this.computed( index, this.options.property );
	}
}

