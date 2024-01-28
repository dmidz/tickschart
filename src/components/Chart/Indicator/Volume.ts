
import Base, { type BaseOptions, type BarStyle, type LineStyle } from './Base';
import type { CandleTick as Tick } from '@/components/Chart/_shared';

//______
export type Options = Partial<BaseOptions> & {
	showSales: boolean,
	styleBars: BarStyle,
	styleMa: LineStyle,
	styleMa2: LineStyle,
	maProp: 'sma' | 'ema',// | false,
	maLength: number,
	flagMult: number,
	styleFlag: LineStyle,
}

//__ would never be used, its purpose is to define properties set in compute()
//__ and make sure to operate on valid object and so avoid a lot of checks
const defaultComputed = {
	ma: 0,
	ma2: 0,
};

type Computed = typeof defaultComputed;

// let count = 0;
export default class Volume extends Base<Options, Computed> {

	constructor ( key: Base<Options, Computed>['key'], options: Partial<Options> = {} ){
		
		super( key, defaultComputed,
			{
			showSales: false,
			styleBars: {
				fillColor: '#444444',
			},
			styleMa: {
				color: '#409eff',//'#00d28d'
			},
			styleMa2: {
				color: '#ff4040',//'#00d28d'
			},
			maProp: 'sma',
			maLength: 10,
			flagMult: 3,
			styleFlag: { color: '#ffffff' },
			...options,
			// compute: ,
		} );

		this.options.maLength = Math.max( 1, Math.round( this.options.maLength ));
		
		// console.log('new Volume', this.options );
	}
	
	draw(){
		this.plotBar( 'vol', this.options.styleBars );
		//__ sma / ema
		if ( this.options.maProp ){
			this.plot( 'ma', this.options.styleMa );
			super.plot( 'ma2', this.options.styleMa2 );

			// if ( this.options.flagMult ){
			// 	const maMult = this.computedValueNumber( index, 'vol' ) - this.computedValueNumber( index, 'ma' ) * this.options.flagMult;
			// 	if ( maMult > 0 ){
			// 		drawCtxt.plotCircle( 'vol', this.options.styleFlag );
			// 	}
			// }
		}
	}
	
	computeSetup(){
		// console.log( 'computedSetup', this.lib );
		return {
			ma: this.lib.sma( 'vol', this.options.maLength ),
			ma2: this.lib.sma( 'ma', this.options.maLength ),
			// ma: () => {
			// 	return super.lib.sma('vol');
			// },
			// ma2: () => {
			//
			// }
		};
	}
	
	getMinY( tick: Tick, index: number ): number {
		return 0;
	}

	getMaxY( tick: Tick, index: number ): number {
		return tick.vol;
	}
}

