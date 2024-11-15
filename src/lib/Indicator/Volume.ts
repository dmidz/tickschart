
import merge from '../utils/merge.ts';
import Base, { type BaseOptions, type BarStyle, type LineStyle, Setting, Settings } from './Base.ts';

//__ contract of constructor arg options
export type Options = {
	maType: 'sma' | 'ema' | false,
	maLength: number,
	styleBars: BarStyle,
	styleMa: LineStyle,
}

//__ define the computed propertied used in computeSetup & draw
type Computed = { 
	ma: number,
};

export default class Volume extends Base<Options, Computed> {

	userSettings: Settings<Options> = [
		new Setting('maType', 'select', {
			label: 'MA type',
			choices: [
				{ label: 'None', value: false },
				{ label: 'SMA', value: 'sma' },
				{ label: 'EMA', value: 'ema' },
			],
		}),
		new Setting('maLength', 'number', {
			label: 'MA length',
			min: 0,
			max: 200,
		}),
	] as const;
	
	constructor ( options: Partial<Options & BaseOptions> = {} ){

		const _options: Required<Options> & Partial<BaseOptions> = {// force set default options
			maType: 'sma',
			maLength: 14,
			styleBars: {
				fillColor: '#444444',
			},
			styleMa: {
				color: '#0080c5'
			},
		};
		
		super( merge( _options, options ) );

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
