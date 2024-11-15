

import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type LineStyle, DisplayMode, Settings, Setting } from './Base.ts';

//______
export type Options = {
	property: Parameters<Base<BaseOptions, Computed>['computed']>[1],
	type: 'sma' | 'ema',
	length: number,
	style: LineStyle,
	// ma2: {
	// 	property: Parameters<Base<BaseOptions, Computed>['computed']>[1],
	// 	type: 'sma' | 'ema',
	// 	length: number,
	// 	lineColor: string,
	// 	lineThickness: number,
	// },
}

//__ define the computed propertied used in computeSetup & draw
type Computed = {
	ma: number
};

const properties = [ 'close', 'open', 'high', 'low' ];

export default class MA extends Base<Options, Computed> {

	static readonly label = 'SMA / EMA';

	readonly displayMode: DisplayMode = 'layer';

	readonly userSettings: Settings<Options> = [
		new Setting( 'property', 'select', {
			label: 'Property',
			choices: properties.map( ( key ) => ( { label: key, value: key } ) ),
		} ),
		new Setting( 'type', 'select', {
			label: 'Type',
			choices: [ 'sma', 'ema' ].map( ( key ) => ( { label: key, value: key } ) ),
		} ),
		new Setting( 'length', 'number', {
			label: 'length',
			min: 0,
			max: 200,
		} ),
		// ['ma2.property', new Setting( 'select', {
		// 	label: 'Property',
		// 	choices: properties.map( ( key ) => ( { label: key, value: key } ) ),
		// } )],
	];

	constructor ( options: Partial<Options & BaseOptions> = {} ){
		
		const _options: Required<Options> & Partial<BaseOptions> = {// force set default options
			property: 'close',
			type: 'sma',
			length: 50,
			style: {
				color: '#ffff00'
			},
			// ma2: {
			// 	property: 'close',
			// 	type: 'sma',
			// 	length: 50,
			// 	lineColor: '#4dffc3',
			// 	lineThickness: 1,
			// }
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

