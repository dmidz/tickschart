
import Base, { type BaseOptions, type BarStyle, type LineStyle } from './Base.ts';
import type { CandleTick as Tick } from '../index.ts';

//______
export type Options = Partial<BaseOptions> & {
	showSales: boolean,
	styleBars: BarStyle,
	styleMa: LineStyle,
	maType: 'sma' | 'ema' | false,
	maLength: number,
}

//__ would never be used, its purpose is to define properties set in computeSetup
//__ and make sure to operate on valid object and so avoid a lot of checks
const defaultComputed = {
	ma: 0,
};

type Computed = typeof defaultComputed;

export default class Volume extends Base<Options, Computed> {

	constructor ( key: Base<Options, Computed>['key'], options: Partial<Options> = {} ){
		
		super( key, defaultComputed,
			{
			showSales: false,
			styleBars: {
				fillColor: '#444444',
			},
			styleMa: {
				color: '#0080c5'
			},
				maType: 'sma',
			maLength: 10,
			...options,
		} );

		this.options.maLength = Math.max( 1, Math.round( this.options.maLength ));
	}
	
	draw(){
		this.plotBar( 'vol', this.options.styleBars );
		//__ sma / ema
		if ( this.options.maType ){
			this.plot( 'ma', this.options.styleMa );
		}
	}
	
	computeSetup(){
		return {
			ma: this.lib[this.options.maType||'sma']( 'vol', this.options.maLength ),
		};
	}
	
	getMinY( tick: Tick, index: number ): number {
		return 0;
	}

	getMaxY( tick: Tick, index: number ): number {
		return tick.vol;
	}
}

