
import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type BarStyle, type LineStyle } from './Base.ts';
import { type InputOptionsList } from '../UI/index.ts';

//__ contract of constructor arg options
export type Options = {
	maType?: 'sma' | 'ema' | false,
	maLength?: number,
	styleBars?: BarStyle,
	styleMa?: LineStyle,
}

//__ would never be used, its purpose is to define properties set in computeSetup
//__ and make sure to operate on valid object and so avoid a lot of checks
const defaultComputed = {
	ma: 0,
};

type Computed = typeof defaultComputed;

export default class Volume extends Base<Required<Options>, Computed> {
	
	label = 'Volume';
	
	settings: {
		maType: InputOptionsList['select'],
		maLength: InputOptionsList['number'],
	} = {
		maType:{
			type: 'select',
			label: 'MA type',
			choices: [
				{
					label: 'None',
					value: false,
				},
				{
					label: 'SMA',
					value: 'sma',
				},
				{
					label: 'EMA',
					value: 'ema',
				},
			],
		},
		maLength:{
			type: 'number',
			label: 'MA length',
			min: 0,
			max: 200,
		},
	};

	constructor ( options: Options & Partial<BaseOptions> ){

		/*__ force optional constructor options to be set here */
		const _options: ReverseRequired<Options> = {
			maType: 'sma',
			maLength: 10,
			styleBars: {
				fillColor: '#444444',
			},
			styleMa: {
				color: '#0080c5'
			},
		};
		
		super( defaultComputed, merge( _options, options ) );

		this.options.maLength = Math.max( 1, Math.round( this.options.maLength ) );
	}
	
	draw(){
		this.plotBar( 'volume', this.options.styleBars );
		//__ sma / ema
		if ( this.options.maType ){
			this.plot( 'ma', this.options.styleMa );
		}
	}
	
	computeSetup(){
		return {
			ma: this.lib[this.options.maType||'sma']( 'volume', this.options.maLength, true ),
		};
	}
	
	getMinY( index: number ): number {
		return 0;
	}

	getMaxY( index: number ): number {
		return this.computed( index, 'volume' );
	}
}

