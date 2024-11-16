
import merge from './utils/merge.ts';
import { ScalingLinear, type Scale } from './utils/math.ts';
import UiScale, { type Options as UiScaleOptions } from './UiScale.ts';
import type { Base } from './Indicator/index.ts';
import { createElement, resizeCanvas, type ElementRect } from './index';
import IndicatorHeader from './IndicatorHeader.ts';

type Chart<I extends Base = Base> = {
	parentElement: HTMLElement,
	displayIndicatorSettings: ( indicator: I ) => void,
	removeIndicator: ( indicator: I ) => void,
	activateIndicator: ( indicator: I, isActive: boolean ) => void,
};

//______
export type Options = {
	height?: number,
	border?: string,
	yScaleWidth?: number,
	autoScaleY?: boolean,
	scaleY?: UiScaleOptions,
	canvas?: {
		imageSmoothingEnabled: false,
		lineWidth: 1,
		// strokeStyle: '#ff0000',
	},
	onMouseEnter?: ( event: MouseEvent, emitter: ChartRow ) => void,
	onMouseLeave?: ( event: MouseEvent ) => void,
	onMouseDown?: ( event: MouseEvent, emitter: ChartRow ) => void,
	onMouseWheel?: ( event: WheelEvent ) => void,
}

export default class ChartRow<Indicator extends Base = Base> {
	options: Required<Options> = {
		height: 120,
		border: '1px solid #333333',
		yScaleWidth: 100,
		canvas: {
			imageSmoothingEnabled: false,
			lineWidth: 1,
			// strokeStyle: '#ff0000',
		},
		autoScaleY: true,
		scaleY: {},
		onMouseEnter: () => {},
		onMouseLeave: () => {},
		onMouseDown: () => {},
		onMouseWheel: () => {},
	};
	
	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private elements: Map<string,HTMLElement> = new Map();
	
	// private validXMinMax = false;
	scalingY: ScalingLinear;

	private uiScaleY: UiScale;
	cy = 1;
	mouseArea: ElementRect;

	constructor ( private chart: Chart, private key: string|number, private indicator: Indicator, tickValue: Indicator['tickValue'], 
								parentElement: HTMLElement, scalingX: ScalingLinear,
								chartCanvasContext: CanvasRenderingContext2D, charScalingY: ScalingLinear,
								private onScaleY: ( scaling: ScalingLinear, emitter: ChartRow ) => void,
								options: Options = {} ){

		this.options = merge( this.options, options );

		const { canvas, ctx, mouseArea } = this.createElements( parentElement );
		this.canvas = canvas;
		this.ctx = ctx;
		this.ctx.lineWidth = 1;
		this.mouseArea = mouseArea;
		this.mouseArea.rect = mouseArea.getBoundingClientRect();

		this.scalingY = new ScalingLinear( { min: 0, max: 100 }, { min: this.canvas.height, max: 0 } );
		
		this.uiScaleY = new UiScale( this.elements.get('scaleY') as HTMLElement, 'y', this.scalingY, {
			minLabelDist: 25,
			...this.options.scaleY,
			onChange: ( scaling, emitter ) => {
				this.options.autoScaleY = false;
				this.setScaleY( scaling.scaleIn );
				this.onScaleY( scaling, this );
			},
			onDoubleClick: ( scaling, emitter ) => {
				this.options.autoScaleY = true;
				this.autoScaleY();
				this.onScaleY( scaling, this );
			},
			// labelPrecision: .01,
		} );

		this.indicator = indicator;
		this.indicator.setContext( tickValue, this.ctx, this.scalingY, scalingX, chartCanvasContext, charScalingY );
	}

	getIndicator(){
		return this.indicator;
	}

	setViewXMinMax( min: number, max: number, opts = {} ){
		this.indicator.setViewXMinMax( min, max, opts );
		this.autoScaleY();
	}

	translateY( delta: number, options?: { yOriginRatio?: number } ){
		this.setY( this.scalingY.scaleIn.min + delta, options );
		return this;
	}

	setY( y: number, { yOriginRatio = 0 } = {} ){
		//__ TODO: yOriginRatio
		this.setScaleY( { min: y, max: y + this.scalingY.distIn } );
		return this;
	}

	autoScaleY(){
		if ( this.options.autoScaleY /*&& this.validXMinMax*/ ){
			this.setScaleY( this.indicator.getMinMaxY() );
		}
		return this;
	}

	setScaleY( scale: Scale ){
		this.cy = this.scalingY.distIn / this.scalingY.distOut;

		if ( this.scalingY.setScaleIn( scale ) ){
			this.uiScaleY.setScaleIn( scale );
		}

		return this;
	}

	resizeCanvas(){

		const resized = resizeCanvas( this.canvas );

		if ( resized ){
			this.uiScaleY.setScaleOut( {
				min: resized.height,
				max: 0,
			} );
		}
		this.mouseArea.rect = this.mouseArea.getBoundingClientRect();

		return resized;
	}
	
	clearRect( x: number, w: number ){
		this.ctx.clearRect( x, 0, w, this.canvas.height );
	}

	remove(){
		this.beforeDestroy();
		this.getElement( 'row' )?.remove();
	}
	
	beforeDestroy(){
		const mouseArea = this.elements.get( 'mouseArea' );

		if( mouseArea ){
			mouseArea.removeEventListener( 'mouseenter', this.onMouseEnter );
			mouseArea.removeEventListener( 'mouseleave', this.options.onMouseLeave );
			mouseArea.removeEventListener( 'mousedown', this.onMouseDown );
			mouseArea.removeEventListener( 'wheel', this.options.onMouseWheel );
		}
	}
	
	getElement( key: string ){
		return this.elements.get( key );
	}

	private createElements( parentElement: HTMLElement ): { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, mouseArea: HTMLElement }{
		const row = createElement( 'div', {
			relativeElement: parentElement,
			className: `row-ind ind-${ this.key }`,
			style: {
				position: 'relative',
				height: `${this.options.height}px`,
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'stretch',
				overflow: 'hidden',
				borderTop: this.options.border,
			}
		} );
		this.elements.set('row', row );

		const draw = createElement( 'div', {
			relativeElement: row,
			className: `row-ind-draw indctr-${ this.key }`,
			style: { flex: '1 1', overflow: 'hidden', cursor: 'crosshair' }
		} );
		this.elements.set( 'draw', draw );

		const canvas = document.createElement( 'canvas' );
		Object.assign( canvas.style, {
			display: 'block', pointerEvents: 'none',
		});
		const ctx = canvas.getContext( '2d' );
		if ( !ctx ){
			throw new Error( 'Invalid canvas context' );
		}
		Object.assign( ctx, this.options.canvas );
		draw.append( canvas );
		this.elements.set( 'canvas', canvas );

		const scaleY = createElement( 'div', {
			relativeElement: row,
			className: 'scale scale-y',
			style: {
				borderLeft: this.options.border,
				width: `${ this.options.yScaleWidth }px`,
				color: '#cccccc',
			}
		} );
		this.elements.set( 'scaleY', scaleY );

		//____ mouse area: main without yScale
		const mouseArea = createElement( 'div', {
			relativeElement: row,
			className: 'mouse-area',
			style: {
				display: 'block', zIndex: '95', position: 'absolute', cursor: 'crosshair',
				left: '0', top: '0', bottom: '0', right: scaleY.style.width,
			}
		} );
		this.elements.set('mouseArea', mouseArea );
		
		//___ indicator header
		new IndicatorHeader( row, this.chart.parentElement, this.indicator, {
			onOpenSettings: this.chart.displayIndicatorSettings,
			onRemove: this.chart.removeIndicator,
			onActivate: this.onActivate,
		} );

		//__ events
		mouseArea.addEventListener( 'mouseenter', this.onMouseEnter );
		mouseArea.addEventListener( 'mouseleave', this.options.onMouseLeave );
		mouseArea.addEventListener( 'wheel', this.options.onMouseWheel );
		mouseArea.addEventListener( 'mousedown', this.onMouseDown );

		//__
		return { canvas, ctx, mouseArea };
	}
	
	private onActivate = ( indicator: Base, isActive: boolean ) => {
		const root = this.elements.get( 'row' );
		if( root ){
			root.style.height = `${ isActive ? this.options.height : 24 }px`;
		}
		
		this.chart.activateIndicator( indicator, isActive );
	}
	
	private onMouseEnter = ( event: MouseEvent ) => {
		this.options.onMouseEnter( event, this );
	}

	private onMouseDown = ( event: MouseEvent ) => {
		this.options.onMouseDown( event, this );
	}
}
