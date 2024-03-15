
import { ScalingLinear, type Point } from '../utils/math';
import { type TickProp } from '../index';
import Computation, { type ComputeFunc } from './Computation';

//______
export type BaseOptions = {
	debug: boolean,
}

export type BarStyle = {
	fillColor: string,
}

export type LineStyle = {
	color: string,
}

export type ShapeStyle = {
	fillColor?: string,
	borderColor?: string,
}

export type LowHigh = {
	index: number,
	value: number,
	date?: string,
	next?: LowHigh | null,
	[key: string]: any,
}

export type DrawOptions = {
	onChart?: boolean,
	yDelta?: number,
}

const defaultShapeFillColor = '#ffffff';

export default abstract class Base<Options extends ObjKeyStr,
			Computed extends ObjKeyStr,
			CK extends KeyOfString<Computed> = KeyOfString<Computed>,
			TCK extends TickProp | CK = TickProp | CK> {
	private compute: { [key in CK]: ComputeFunc };
	public options: BaseOptions & Options;
	protected tickValue!: ( index: number, prop: TickProp, delta?: number ) => any;
	private ctx!: CanvasRenderingContext2D;
	protected scalingY!: ScalingLinear;
	protected scalingX!: ScalingLinear;
	private chartCtx!: CanvasRenderingContext2D;
	protected chartScalingY!: ScalingLinear;
	protected tickStep = 1;
	protected xMin = 0;
	protected xMax = 0;
	private cacheComputed: Map<CK,Map<number,number>> = new Map();
	private cacheMin = +Infinity;
	private cacheMax = -Infinity;
	private readonly computeKeys: Map<CK,true> = new Map();
	protected lib: Computation<TCK>;
	private drawing = {
		x: 0,
		width: 0,
		index: 0,
	}

	constructor ( private readonly defaultComputed: Computed,
								options: Options ){

		const baseOptions: BaseOptions = {
			debug: true,
		};
		this.options = Object.assign( baseOptions, options );

		//___
		(Object.keys( this.defaultComputed ) as CK[]).forEach( (key: CK) => {
			this.computeKeys.set( key, true );
		} );
		this.lib = new Computation<TCK>( this.tickStep, this.computed.bind( this ) );
		this.compute = this.computeSetup();
	}
	
	abstract draw( index: number ): void;
	abstract computeSetup(): ({ [key in CK]: ComputeFunc });
	
	setContext( tickValue: ( index: number, prop: TickProp ) => any, canvasContext: CanvasRenderingContext2D,
			scalingY: ScalingLinear, scalingX: ScalingLinear, chartCanvasContext: CanvasRenderingContext2D, charScalingY: ScalingLinear ){
		this.tickValue = tickValue;
		this.ctx = canvasContext;
		this.scalingY = scalingY;
		this.scalingX = scalingX;
		this.chartCtx = chartCanvasContext;
		this.chartScalingY = charScalingY;
		this.reset();
	}

	setTickStep( tickStep: number ){
		if( tickStep === this.tickStep ){ return;}
		// console.log('setTickStep', this.tickStep );
		this.tickStep = Math.max( 1, tickStep );
		this.lib.setTickStep( tickStep );
		this.reset();
	}
	
	reset(){
		this.cacheComputed = new Map();
		this.compute = this.computeSetup();
	}
	
	setViewXMinMax( min = this.xMin, max = this.xMax, opts?: { force?: boolean, clear?: boolean } ){
		if( !min ){  return;}
		
		const { force = false } = opts||{};
		
		if ( !force && min === this.xMin && max === this.xMax ){
			return;
		}
		if ( max < min ){
			console.warn( 'min < max !' );
			return;
		}
		
		this.xMin = min;
		this.xMax = max;

		this.reset();

		// this.debug( '____ setViewXMinMax', {
		// 	xMin: this.xMin,
		// 	xMinDate: new Date( this.xMin ).toUTCString(),
			// xMax: this.xMax, d,
			// cacheComputed: this.cacheComputed.size
		// } );

	}
	
	getMinMaxY(): MinMax {
		const res = { min: Infinity, max: -Infinity };
		let current = this.xMin;
		// this.debug('_____ getMinMaxY START' );
		while ( current <= this.xMax ){
			// this.debug( '__ getMinMaxY', tick.time, new Date( tick.time ).toUTCString() );
			res.min = Math.min( res.min, this.getMinY( current ) );
			res.max = Math.max( res.max, this.getMaxY( current ) );
			current += this.tickStep;
		}

		return res;
	}

	getMinY( index: number ): number {
		return 0;
	}

	getMaxY( index: number ): number {
		return 100;
	}

	//__ drawing
	drawTick( x: number, width: number, index: number ){
		this.drawing.x = x;
		this.drawing.width = width;
		this.drawing.index = index;
		// this.debug('__ drawTick', tick.time, new Date( tick.time ).toUTCString() );
		this.draw( index );
	}

	plotBar( propOrValue: TCK | number | false, style: BarStyle ){
		if ( propOrValue === false ){
			return;
		}
		const y = this.scalingY.scaleTo(typeof propOrValue === 'string' ? this.computed( this.drawing.index, propOrValue ) : propOrValue );
		this.ctx.fillStyle = style.fillColor;
		this.ctx.fillRect( this.drawing.x, y, this.drawing.width, this.scalingY.scaleTo( 0 )-y );
	}

	plot( propOrValue: TCK | false, style: LineStyle ) {
		if ( propOrValue === false ){
			return;
		}
		const xWick = this.drawing.x - this.drawing.width / 2;
		const ySrc = this.scalingY.scaleTo( this.computed( this.drawing.index, propOrValue, 1 ) );
		const y = this.scalingY.scaleTo( this.computed( this.drawing.index, propOrValue ) );
		// console.log( 'plot', ySrc, y, this.prev.plotY );
		this.ctx.beginPath();
		this.ctx.moveTo( xWick, ySrc );
		this.ctx.lineTo( xWick + this.drawing.width, y );
		this.ctx.strokeStyle = style.color;
		this.ctx.stroke();
	}
	
	plotDisc( propOrValue: TCK | number | false, style: ShapeStyle, opts: DrawOptions = {} ){
		if( propOrValue === false ){ return;}
		let ctx = this.ctx;
		let scalingY = this.scalingY;
		if( opts.onChart ){
			ctx = this.chartCtx;
			scalingY = this.chartScalingY;
		}
		const d = this.drawing.width / 2;
		const x = this.drawing.x + d;
		const y = scalingY.scaleTo( typeof propOrValue === 'string' ? this.computed( this.drawing.index, propOrValue ) : propOrValue ) - (opts.yDelta||0);
		// console.log( 'plotDisc', y );
		ctx.beginPath();
		ctx.arc( x, y, 3/*d*/, 0, 2 * Math.PI );
		ctx.fillStyle = style.fillColor || defaultShapeFillColor;
		ctx.fill();
		// this.ctx.strokeStyle = style.color;
		// this.ctx.stroke();
	}
	
	drawLine( ptStart: Point, ptEnd: Point, style: LineStyle ){
		// const y = this.scalingY.scaleTo( this.computed( this.drawing.index, propOrValue ) );
		// // console.log( 'plot', ySrc, y, this.prev.plotY );
		this.ctx.beginPath();
		const w = this.drawing.width / 2;
		this.ctx.moveTo( w+this.scalingX.scaleTo( ptStart.x ), this.scalingY.scaleTo( ptStart.y ) );
		this.ctx.lineTo( w +this.scalingX.scaleTo( ptEnd.x ), this.scalingY.scaleTo( ptEnd.y ) );
		this.ctx.strokeStyle = style.color;
		this.ctx.stroke();

	}

	//________
	computed( index: number, prop: TCK, delta = 0 ): number {
		const _index = index - delta * this.tickStep;
		const pc = prop as CK;
		const isComputeKey = this.computeKeys.get( pc );
		let value = this.cacheGet( pc, _index );
		if ( typeof value !== 'undefined' ){
			return value;
		}
		if ( isComputeKey ){
			value = Computation.asNumber( this.compute[ pc ]( _index, this.cacheGet( pc, _index-this.tickStep ) ) );
		} else {
			value = Computation.asNumber( this.tickValue( index, prop as TickProp, delta ) )
		}
		this.cacheSet( pc, _index, value );
		return value;
	}
	
	//___
	getLowsHighs( prop: TCK | TCK[], confirmDelta = 58, start = this.xMin, end = this.xMax ){
		
		let lowProp: TCK;
		let highProp: TCK;
		if( prop instanceof Array ){
			lowProp = prop[0];
			highProp = prop[1];
		}else{
			lowProp = prop;
			highProp = prop;
		}
		
		const highs: Map<number, LowHigh> = new Map();
		const lows: Map<number, LowHigh> = new Map();
		let low: LowHigh = { index: 0, value: Infinity };
		let high: LowHigh = { index: 0, value: -Infinity };
		let prevLow: LowHigh | null = null;
		let prevHigh: LowHigh | null = null;
		let highest = high;
		let lowest = high;
		let lastHigh = false;

		const delta = confirmDelta * this.tickStep;

		let index = Math.max( start, this.xMin ) - delta;
		const max = Math.min( end, this.xMax );

		const d2 = this.tickStep * 3;

		while ( index <= max ){
			if ( !lows.size || lastHigh ){
				const value = this.computed( index, lowProp );

				if ( value < low.value ){
					low.value = value;
					low.index = index;
				} else if ( index > low.index + delta ){
					low.key = highs.size;
					if( prevLow ){
						prevLow.next = low;
					}
					if ( low.value < lowest.value ){
						delete lowest.lowest;
						lowest = low;
						lowest.lowest = true;
					}
					lows.set( low.index, low );
					prevLow = low;
					low = { index: low.index, value: Infinity };
					lastHigh = false;
					index = low.index + d2;//_ TODO: try optim ( not going back )
					continue;
				}
			}

			if ( !highs.size || !lastHigh ){
				const value = this.computed( index, highProp );
				if ( value > high.value ){
					high.value = value;
					high.index = index;
				} else if ( index > high.index + delta ){
					high.key = highs.size;
					if( prevHigh ){
						prevHigh.next = high;
					}
					if ( high.value > highest.value ){
						delete highest.highest;
						highest = high;
						highest.highest = true;
					}
					highs.set( high.index, high );
					prevHigh = high;
					high = { index: high.index, value: -Infinity };
					lastHigh = true;
					index = high.index + d2;
					continue;
				}
			}

			index += this.tickStep;
		}

		// console.log( 'lows, highs', lows, highs );

		return { lows, highs, /*lowest, highest,*/ isUpTrend: highest.index > lowest.index };

	}
	
	minValue( prop: TCK, start = this.xMin, end = this.xMax ){
		const res: LowHigh = { index: 0, value: Infinity };

		let index = Math.max( start, this.xMin );
		const max = Math.min( end, this.xMax );
		while ( index <= max ){
			const value = this.computed( index, prop );
			if ( value ){
				if ( value < res.value ){
					res.value = value;
					res.index = index;
				}
			}
			index += this.tickStep;
		}
		return res;
	}

	maxValue( prop: TCK, start = this.xMin, end = this.xMax ){
		const res: LowHigh = { index: 0, value: -Infinity };

		let index = Math.max( start, this.xMin );
		const max = Math.min( end, this.xMax );
		while ( index <= max ){
			const value = this.computed( index, prop );
			if ( value ){
				if ( value > res.value ){
					res.value = value;
					res.index = index;
				}
			}
			index += this.tickStep;
		}
		return res;
	}

	minMaxValue( prop: TCK, start = this.xMin, end = this.xMax ){
		const min: LowHigh = { index: 0, value: Infinity };
		const max: LowHigh = { index: 0, value: -Infinity };

		let index = Math.max( start, this.xMin );
		const maxIndex = Math.min( end, this.xMax );
		while ( index <= maxIndex ){
			const value = this.computed( index, prop );
			if ( value ){
				if ( value < min.value ){
					min.value = value;
					min.index = index;
				}
				if ( value > max.value ){
					max.value = value;
					max.index = index;
				}
			}
			index += this.tickStep;
		}
		
		return { min, max };

	}
	
	//__________
	beforeDestroy(){
		return this;
	}

	protected cacheGet( prop: CK, index: number = 0 ): number | undefined {
		return this.cacheComputed.get( prop )?.get( index );
	}

	protected cacheSet( prop: CK, index: number, value: number ) {
		this.cacheMin = Math.min( this.cacheMin, index );
		this.cacheMax = Math.max( this.cacheMax, index );
		let m = this.cacheComputed.get( prop );
		if ( !m ){
			m = new Map<number, number>();
			this.cacheComputed.set( prop, m );
		}
		m.set( index, value );
		return value;
	}
	
	protected debug ( ...args: any[] ){
		if ( this.options.debug ){
			console.log( ...args );
		}
	}

}
