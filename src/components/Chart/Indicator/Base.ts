
import { ScalingLinear } from '@/utils/math';
import { defaultTick, type GetTick, type CandleTick as Tick } from '../_shared';
import Computation, { type ComputeFunc } from './Computation.ts';

type TK = KeyOfValue<Tick, number>;

//______
export type BaseOptions = {
	tickIndex: KeyOfValue<Tick, number>,
	debug: boolean,
}

export type BarStyle = {
	fillColor: string,
}

export type LineStyle = {
	color: string,
}

const defaultScalingY = new ScalingLinear( { min: 0, max: 10 }, { min: 0, max: 10 } );
const defaultCanvas = document.createElement( 'canvas' );

export default abstract class Base<Options extends Record<string,any>,
			Computed extends Record<string, number>,
			CK extends KeyOfString<Computed> = KeyOfString<Computed>,
			TCK extends TK | CK= TK | CK> {
	private readonly compute: { [key in CK]: ComputeFunc };
	protected options: BaseOptions & Options;
	private getTick: GetTick = () => defaultTick;
	private ctx: CanvasRenderingContext2D = defaultCanvas.getContext( '2d' ) as CanvasRenderingContext2D;
	private scalingY: ScalingLinear = defaultScalingY;
	private tickStep = 1;
	private xMin = 0;
	private xMax = 0;
	private cacheComputed: Map<number,Map<CK,number>> = new Map();
	private cacheIntern: Map<number,Record<string,any>> = new Map();
	private cacheClearTimeout: ReturnType<typeof setTimeout> | undefined;
	private cacheMin = +Infinity;
	private cacheMax = -Infinity;
	private cacheDist = 0;
	private cacheSizeMax = 0;
	private readonly computeKeys: Map<CK,true> = new Map();
	protected lib: Computation<TCK>;

	private drawing = {
		x: 0,
		width: 0,
		index: 0,
		tick: defaultTick,
	}

	constructor ( public key: string,
								private readonly defaultComputed: Computed,
								options: Options ){

		this.options = Object.assign( {
			tickIndex: 'time' as const,
			debug: true,
		}, options );

		//___
		(Object.keys( this.defaultComputed ) as CK[]).forEach( (key: CK) => {
			this.computeKeys.set( key, true );
		} );
		this.lib = new Computation<TCK>( this );
		this.compute = this.computeSetup( this.lib );
	}
	
	abstract draw(): void;
	abstract computeSetup( lib: Computation<TCK> ): ({ [key in keyof Computed]: ComputeFunc });
	
	setContext( getTick: GetTick, canvasContext: CanvasRenderingContext2D, scalingY: ScalingLinear ){
		this.getTick = getTick;
		this.ctx = canvasContext;
		this.scalingY = scalingY;
	}

	setTickStep( tickStep: number ){
		if( tickStep === this.tickStep ){ return;}
		// console.log('setTickStep', this.tickStep );
		this.tickStep = tickStep;
		// this.compute = this.computeSetup( this.lib );
		this.reset();
		// this.setViewXMinMax( this.xMin, this.xMax, false );
	}
	
	reset(){
		this.cacheComputed = new Map();
		this.cacheIntern = new Map();
	}
	
	setViewXMinMax( min = this.xMin, max = this.xMax, clear = true ){
		if( !min ){  return;}

		this.xMin = min;
		this.xMax = max;
		const d = Math.round( ( this.xMax - this.xMin ) / this.tickStep );
		const size = Math.round( d * .6 );
		this.cacheDist = size * this.tickStep;
		this.cacheSizeMax = d + size * 2;

		// this.debug( '____ setViewXMinMax', {
		// 	xMin: this.xMin,
		// 	xMinDate: new Date( this.xMin ).toUTCString(),
		// 	xMax: this.xMax, d,
		// 	cacheDist:this.cacheDist,
		// 	cacheSizeMax: this.cacheSizeMax,
		// 	cacheComputed: this.cacheComputed.size } );

		clearTimeout( this.cacheClearTimeout );
		if( clear ){
			this.cacheClearTimeout = setTimeout( this.cacheClean.bind( this ), 3000 );
		}
	}
	
	getMinMaxY(): MinMax {
		const res = { min: Infinity, max: -Infinity };
		let tick: Tick;
		let current = this.xMin;
		// this.debug('_____ getMinMaxY START' );
		while ( current <= this.xMax ){
			tick = this.getTick( current );
			// this.debug( '__ getMinMaxY', tick.time, new Date( tick.time ).toUTCString() );
			res.min = Math.min( res.min, this.getMinY( tick, current ) );
			res.max = Math.max( res.max, this.getMaxY( tick, current ) );
			current += this.tickStep;
		}

		return res;
	}

	getMinY( tick: Tick, index: number ): number {
		return 0;
	}

	getMaxY( tick: Tick, index: number ): number {
		return 0;
	}

	//__ drawing
	drawTick( tick: Tick, x: number, width: number, index: number ){
		this.drawing.tick = tick;
		this.drawing.x = x;
		this.drawing.width = width;
		this.drawing.index = index;
		// this.debug('__ drawTick', tick.time, new Date( tick.time ).toUTCString() );
		this.draw();
	}

	plotBar( prop: TCK, style: BarStyle ){
		const y = this.scalingY.scaleTo( this.computed( this.drawing.index, prop ) );
		// console.log( 'plotBar', y );
		this.ctx.fillStyle = style.fillColor;
		this.ctx.fillRect( this.drawing.x, y, this.drawing.width, this.scalingY.scaleTo( 0 ) - y );
	}

	plot( prop: TCK, style: LineStyle ) {
		const xWick = this.drawing.x - this.drawing.width / 2;
		const ySrc = this.scalingY.scaleTo( this.computed( this.drawing.index, prop, 1 ) );
		const y = this.scalingY.scaleTo( this.computed( this.drawing.index, prop ) );
		// console.log( 'plot', ySrc, y, this.prev.plotY );
		this.ctx.beginPath();
		this.ctx.moveTo( xWick, ySrc );
		this.ctx.lineTo( xWick + this.drawing.width, y );
		this.ctx.strokeStyle = style.color;
		this.ctx.stroke();
	}
	
	plotCircle( prop: TCK, style: LineStyle ){
		const d = this.drawing.width / 2;
		const x = this.drawing.x + d;
		const y = this.scalingY.scaleTo( this.computed( this.drawing.index, prop ) );
		// console.log( 'plotCircle', y );
		this.ctx.beginPath();
		this.ctx.arc( x, y, 3/*d*/, 0, 2 * Math.PI );
		this.ctx.fillStyle = style.color;
		this.ctx.fill();
		// this.ctx.strokeStyle = style.color;
		// this.ctx.stroke();
	}

	//________
	computed( index: number, prop: TCK, delta = 0 ): number {
		const _index = index - delta * this.tickStep;
		const pc = prop as CK;
		const isComputeKey = this.computeKeys.get( pc );
		let value;
		if ( isComputeKey ){
			value = this.cacheGet( _index, pc );
			if( typeof value === 'undefined' ){
				value = this.compute[pc]( _index );
				this.cacheSet( _index, pc, value );
			}
		} else {
			const tick = this.getTick( _index );
			value = tick[ prop as keyof Tick ];
		}
		return Computation.asNumber( value );
	}

	eachTick ( from: number, length: number, op: ( v: number, i: number ) => number, initial = 0 ): number{
		let i = -Math.abs( length );
		let res = initial;
		// console.log( 'eachTick', from );
		while ( i++ < 0 ){
			// console.log( 'i', i, from + i * this.tickStep );
			res = op( res, from + i * this.tickStep );
		}
		return res;
	}

	//__________
	beforeDestroy(){
		return this;
	}

	protected cacheGet( index: number = 0, prop: CK ): number | undefined {
		let m = this.cacheComputed.get( index );
		if ( !m ){
			m = new Map<CK, number>();
			this.cacheComputed.set( index, m );
		}
		return m.get( prop );
	}

	protected cacheSet( index: number, prop: CK, value: number ) {
		this.cacheMin = Math.min( this.cacheMin, index );
		this.cacheMax = Math.max( this.cacheMax, index );
		let m = this.cacheComputed.get( index );
		if ( !m ){
			m = new Map<CK, number>();
			this.cacheComputed.set( index, m );
		}
		m.set( prop, value );
		return value;
	}
	
	private cacheClean(){
		// console.log('___ cacheClean', this.xMin, this.xMax, this.cacheMin, this.cacheMax, this.cacheSizeMax, this.cacheComputed.size );

		if ( this.cacheMin ){
			const start = this.xMin - this.cacheDist;
			// console.log( 'cacheClean', { min, max, start, cacheMin: this.cacheMin, cacheMax: this.cacheMax }, this.cacheComputed.size, this.cacheSizeMax );
			let current = start;
			while ( current >= this.cacheMin ){
				// console.log( '  release min', current );
				this.cacheComputed.delete( current );
				this.cacheIntern.delete( current );
				current -= this.tickStep;
			}
			this.cacheMin = Math.max( start, this.cacheMin );
		}

		if ( this.cacheMax ){
			const start = this.xMax + this.cacheDist;
			let current = start;
			while ( current <= this.cacheMax ){
				// console.log( '  release max', current );
				this.cacheComputed.delete( current );
				this.cacheIntern.delete( current );
				current += this.tickStep;
			}
			this.cacheMax = Math.min( start, this.cacheMax );
		}

		// console.log( 'released', this.cacheComputed.size, this.cacheComputed );

		if ( this.cacheComputed.size > this.cacheSizeMax ){
			console.warn( 'cache.size growing', this.cacheComputed.size );
		}
		
	}

	protected debug ( ...args: any[] ){
		if ( this.options.debug ){
			console.log( ...args );
		}
	}

}
