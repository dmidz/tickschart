

import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type LineStyle, DisplayMode, Settings, Setting, SettingGroup } from './Base.ts';

//______
export type Options = {
	property: Parameters<Base<BaseOptions, Computed>['computed']>[1],
	type: 'sma' | 'ema',
	length: number,
	style: LineStyle,
	ma2: {
		active: boolean,
		property: Parameters<Base<BaseOptions, Computed>['computed']>[1],
		type: 'sma' | 'ema',
		length: number,
		style: LineStyle,
	},
}

//__ define the computed propertied used in computeSetup & draw
type Computed = {
	ma: number
	ma2: number
};

const properties = [ 'close', 'open', 'high', 'low' ];

export default class MA extends Base<Options, Computed> {

	static label = 'SMA / EMA';

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
			label: 'Length',
			min: 2,
			max: 200,
		} ),
		new Setting( 'style.color', 'color', {
			label: 'Color',
		} ),
		new SettingGroup('MA 2', [
			new Setting( 'ma2.active', 'checkbox', {
				label: 'Active',
			} ),
			new Setting( 'ma2.property', 'select', {
				label: 'Property',
				choices: properties.map( ( key ) => ( { label: key, value: key } ) ),
			} ),
			new Setting( 'ma2.type', 'select', {
				label: 'Type',
				choices: [ 'sma', 'ema' ].map( ( key ) => ( { label: key, value: key } ) ),
			} ),
			new Setting( 'ma2.length', 'number', {
				label: 'Length',
				min: 2,
				max: 200,
			} ),
			new Setting( 'ma2.style.color', 'color', {
				label: 'Color',
			} ),
		]),
	];

	userSettingsInHeader: NestedKeyOf<Options & BaseOptions>[] = ['length'];

	constructor ( options: DeepPartial<Options & BaseOptions> = {} ){
		
		const _options: DeepRequired<Options> & Partial<BaseOptions> = {// force set default options
			property: 'close',
			type: 'sma',
			length: 50,
			style: {
				color: '#40e9ff',
				width: 1,
			},
			ma2: {
				active: true,
				property: 'close',
				type: 'sma',
				length: 100,
				style: {
					color: '#ffff00',
					width: 1,
				},
			}
		};
		
		super( merge( _options, options ) );

		this.options.length = Math.max( 1, Math.round( this.options.length ) );
	}

	computeSetup (){
		return {
			ma: this.lib[ this.options.type ]( this.options.property, this.options.length ),
			ma2: this.lib[ this.options.ma2.type ]( this.options.ma2.property, this.options.ma2.length ),
		}
	}

	draw(){
		//__ sma / ema
		this.plot( 'ma', this.options.style );
		if( this.options.ma2.active ){
			this.plot( 'ma2', this.options.ma2.style );
		}
	}
	
	getMinY( index: number ): number {
		return 0;
	}

	getMaxY( index: number ): number {
		return this.computed( index, this.options.property );
	}
}

