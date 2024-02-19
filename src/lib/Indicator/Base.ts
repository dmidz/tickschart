
import { ScalingLinear } from '../utils/math';
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

export default abstract class Base<Options extends ObjKeyStr,
			Computed extends ObjKeyStr,
			CK extends KeyOfString<Computed> = KeyOfString<Computed>,
			TCK extends TickProp | CK = TickProp | CK> {
	private compute: { [key in CK]: ComputeFunc };
	protected options: BaseOptions & Options;
	protected tickValue!: ( index: number, prop: TickProp, delta?: number ) => any;
	private ctx!: CanvasRenderingContext2D;
	private scalingY!: ScalingLinear;
	private tickStep = 1;
	private xMin = 0;
	private xMax = 0;
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
	private tickIndexMax: number | undefined;

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
	
	setContext( tickValue: ( index: number, prop: TickProp ) => any, canvasContext: CanvasRenderingContext2D, scalingY: ScalingLinear ){
		this.tickValue = tickValue;
		this.ctx = canvasContext;
		this.scalingY = scalingY;
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
	}
	
	setViewXMinMax( min = this.xMin, max = this.xMax, opts?: { force?: boolean, clear?: boolean, tickIndexMax?: number } ){
		if( !min ){  return;}
		
		const { force = false, tickIndexMax } = opts||{};
		
		if ( !force && min === this.xMin && max === this.xMax ){
			return;
		}
		if ( max < min ){
			console.warn( 'min < max !' );
			return;
		}
		
		this.tickIndexMax = tickIndexMax;
		
		this.xMin = min;
		this.xMax = max;

		this.reset();

		// this.debug( '____ setViewXMinMax', {
		// 	xMin: this.xMin,
		// 	xMinDate: new Date( this.xMin ).toUTCString(),
		// 	xMax: this.xMax, d,
		// 	cacheDist:this.cacheDist,
		// 	cacheSizeMax: this.cacheSizeMax,
		// 	cacheComputed: this.cacheComputed.size } );

	}
	
	getMinMaxY(): MinMax {
		const res = { min: Infinity, max: -Infinity };
		let current = this.xMin;
		let max = this.xMax;
		if( typeof this.tickIndexMax !== 'undefined' ){
			max = Math.min( max, this.tickIndexMax );
		}
		// this.debug('_____ getMinMaxY START' );
		while ( current <= max ){
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
