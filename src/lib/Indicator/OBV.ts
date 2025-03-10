
import merge from '../utils/merge.ts';
import Base, {
	type BaseOptions,
	type LineStyle,
	type ShapeStyle,
	type DrawOptions,
	Settings,
	Setting
} from './Base.ts';

//__ contract of constructor arg options
export type Options = {
	style: LineStyle,
	styleDot: {
		neutral: ShapeStyle,
		low: ShapeStyle,
		high: ShapeStyle,
	},
	styleDivergence: {
		bull: LineStyle,
		bear: LineStyle,
	},
}

//__ define the computed propertied used in computeSetup & draw
type Computed = {
	obv: number,
};

export default class OBV extends Base<Options, Computed> {

	static label = 'OBV';

	userSettings: Settings<Options> = [];

	constructor ( options: Partial<Options & BaseOptions> = {} ){

		const _options: Required<Options> & Partial<BaseOptions> = {// force set default options
			style: {
				color: '#0080c5'
			},
			styleDot: {
				neutral: {
					fillColor: '#666666',
				},
				low: {
					fillColor: '#ff4040',
				},
				high: {
					fillColor: '#4dffc3',
				},
			},
			styleDivergence: {
				bear: {
					color: '#ff4040'
				},
				bull: {
					color: '#4dffc3'
				},
			},
		};
		
		super( merge( _options, options ) );
	}

	// private divergence: Divergence | null = null;
	// private divergence: Divergence = divergences.lowsHighsDiv2;

	draw( index: number ){
		this.plot( 'obv', this.options.style );
		// console.log('draw', this.divergence.lowsHighs.isUpTrend/*index, new Date( index ).toUTCString()*/ );
		// this.divergence.draw( index );
	}
	
	computeSetup(){
		// if( this.xMin && this.xMax ){
		// 	this.divergence.setup( this );
		// }
		
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

type Divergence = {
	setup: ( indicator: OBV ) => void,
	draw: ( index: number ) => void,
	[ key: string ]: any,
}

const divergences: { [ key: string ]: Divergence } = {
	lowsHighsDiv2: {
		lowsHighsConfirmDelta: 25,
		dotHighOptions: { /*onChart: true,*/ yDelta: 10 } as DrawOptions,
		dotLowOptions: { /*onChart: true,*/ yDelta: -10 } as DrawOptions,
		dotHighOptionsChart: { onChart: true, yDelta: -10 } as DrawOptions,
		dotLowOptionsChart: { onChart: true, yDelta: 10 } as DrawOptions,
		setup ( indicator ){
			this.indicator = indicator;
			this.lowsHighs = indicator.getLowsHighs( [ 'low', 'high' ], this.lowsHighsConfirmDelta );
		},
		draw ( index ){
			const prev = this.indicator.computed( index - this.indicator.tickStep, 'obv' );
			const value = this.indicator.computed( index, 'obv' );

			const high = this.lowsHighs.highs.get( index );
			if( high ){
				// this.indicator.plotDisc( high.value, this.indicator.options.styleDot.neutral, this.dotLowOptionsChart );
				if ( prev > value ){
					this.indicator.plotDisc( prev, this.indicator.options.styleDot.low, this.dotHighOptions );
				}
			}

			const low = this.lowsHighs.lows.get( index );
			if( low ){
				// this.indicator.plotDisc( low.value, this.indicator.options.styleDot.neutral, this.dotHighOptionsChart );
				if ( prev < value ){
					this.indicator.plotDisc( prev, this.indicator.options.styleDot.high, this.dotHighOptions );
				}
			}
		}
	},
	lowsHighsDiv: {
		lowsHighsConfirmDelta: 58,
		plotDiscOptions: { onChart: true } as DrawOptions,
		setup ( indicator ){
			this.indicator = indicator;
			this.lowsHighs = indicator.getLowsHighs( [ 'low', 'high' ], this.lowsHighsConfirmDelta );
			// this.lowsHighs = this.getLowsHighs( 'obv', this.options.lowsHighsConfirmDelta );
			// console.log('lows highs', this.lows, this.highs );
		},
		draw ( index ){
			const high = this.lowsHighs.highs.get( index );

			// console.log( 'draw', index, new Date( index ).toUTCString() );
			// console.log('___isUpTrend', this.lowsHighs.isUpTrend/*, index, new Date( index ).toUTCString()*/ );
			if ( high ){
				this.indicator.plotDisc( high.value, this.indicator.options.styleDot.high, this.plotDiscOptions );
				if ( /*this.lowsHighs.isUpTrend &&*/ high.next && high.value < high.next.value ){
					const value = this.indicator.computed( high.index, 'obv' );
					const value2 = this.indicator.computed( high.next.index, 'obv' );
					if ( value > value2 ){
						console.log( 'obv', value, value2 )
						this.indicator.drawLine( { x: high.index, y: value },
							{ x: high.next.index, y: value2 },
							this.indicator.options.styleDivergence.bear );
					}
				}
			}

			const low = this.lowsHighs.lows.get( index );
			if ( low ){
				this.indicator.plotDisc( low.value, this.indicator.options.styleDot.low, this.plotDiscOptions );
				if ( /*!this.lowsHighs.isUpTrend &&*/ low.next && low.value > low.next.value ){
					const value = this.indicator.computed( low.index, 'obv' );
					const value2 = this.indicator.computed( low.next.index, 'obv' );
					if ( value < value2 ){
						this.indicator.drawLine( { x: low.index, y: value },
							{ x: low.next.index, y: value2 },
							this.indicator.options.styleDivergence.bull );
					}
				}
			}
		}
	}
};
