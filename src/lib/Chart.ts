
import merge from './utils/merge.ts';
import { ScalingLinear, type Scale, type ScalingLinearOptions } from './utils/math.ts';
import UiScale, { type Options as UiScaleOptions } from './UiScale.ts';
import { ListenerEventFactory, createElement, resizeCanvas, sharpCanvasValue,
	type CandleTick, type GetTick, type ElementRect, type TickProp, type AbstractTick } from './index.ts';
import { Base, list as indicators } from './Indicator/index.ts';
import ChartRow, { Options as ChartRowOptions } from './ChartRow.ts';
import { Dialog, Popover, InputBase } from './UI/index.ts';
import IndicatorSettings from './IndicatorSettings.ts';
import IndicatorSelection from './IndicatorSelection.ts';
import IndicatorHeader from '@/lib/IndicatorHeader.ts';

type Indicator = { new (): any }

//______
export type Options<Tick extends AbstractTick> = {
	tickWidth: number,
	canvas: {
		imageSmoothingEnabled: boolean,
		lineWidth: number,
		// strokeStyle: string,
	},
	candle: {
		color: {
			up: string,
			down: string,
		}
	},
	onScalingXChange: ( scalingX: ScalingLinear ) => OrPromise<any>,
	scaleY: ScalingLinearOptions,
	scaleX: ScalingLinearOptions,
	uiScaleY: UiScaleOptions,
	uiScaleX: UiScaleOptions,
	crossHairLabelX: ( value: number ) => string;
	crossHairLabelY: null | ( ( value: number ) => string );
	keyboard: {
		vx: number,
	},
	autoScaleY: boolean,
	autoScaleYMargin: number,
	yScaleWidth: number,
	wheelScroll: boolean,
	readonly tickIndexMin: ( () => any ) | null,
	readonly tickIndexMax: ( () => number ) | null,
	uiElements: {
		buttonGoMaxX?: boolean | HTMLElement,
	},
	chartRow: ChartRowOptions,
	mapTickProps: { [key in TickProp]: keyof Tick},
	indicators: Readonly<{[key: string]: Indicator }>,
	isDefaultTick: ( tick: Tick ) => boolean,
}

export default class Chart<Tick extends AbstractTick = CandleTick> {

	readonly parentElement: HTMLElement;
	private _getTick: GetTick<Tick>;
	private options: Options<Tick> = {
		tickWidth: 4,
		canvas: {
			imageSmoothingEnabled: false,
			lineWidth: 1,
			// strokeStyle: '#ff0000',
		},
		candle: {
			color: {
				up: '#0080c5',//'#409eff',
				down: '#ffffff',
			},
		},
		onScalingXChange: () => {
		},
		scaleY: {},
		scaleX: {},
		uiScaleY: {},
		uiScaleX: {},
		crossHairLabelX: ( value ) => {
			return `${ value }`;
		},
		crossHairLabelY: null,
		keyboard: {
			vx: .01,
		},
		autoScaleY: true,
		autoScaleYMargin: 30,// px
		yScaleWidth: 100,
		wheelScroll: true,
		tickIndexMin: null,
		tickIndexMax: () => Math.floor( Date.now() / this.tickStep ) * this.tickStep,
		uiElements: {
			buttonGoMaxX: true,
		},
		chartRow: {},
		mapTickProps: { open: 'open', high: 'high', low: 'low', close: 'close', volume: 'volume' },
		indicators,
		isDefaultTick: () => false,
	};

	private elements: Record<string,HTMLElement> = {};
	private canvas: HTMLCanvasElement;
	private width: number = 100;
	private height: number = 100;
	private scalingX: ScalingLinear;
	private scalingY: ScalingLinear;
	private ctxTicks: CanvasRenderingContext2D;
	private uiScaleX: UiScale;
	private uiScaleY: UiScale;
	private tickWidth = 3;
	private tickWidthHalf = 2.5;
	private xStart = 0;
	private xEnd = 100;
	private drag = false;
	private cx = 1;
	private cy = 1;
	private infosLabels = { open: 'O', high: 'H', low: 'L', close: 'C', vol: 'Vol' } as const;
	private mouseOverChart = false;
	private resizing = false;
	private enabledCrossHair = true;
	private border = '1px solid #333333';
	private maxDisplayX: number | null = null;
	private maxRenderX: number = Infinity;
	private chartRows: ChartRow[] = [];
	private mouseElement: ElementRect;
	private mouseIndicator: ChartRow | null = null;
	private mouseDragIndicator: ChartRow | null = null;
	private layers: Base[] = [];
	private layersHeader: IndicatorHeader[] = [];
	private indicatorSettings: IndicatorSettings;
	private indicatorSelection: IndicatorSelection;
	private tickIndexMax: number = Infinity;
	private indicatorsOptions: {[key: string]: { [ key: string ]: any } } = {};
	private tickStepDelta = 0;
	
	constructor ( parentElement: HTMLElement | null,
								public tickStep: number,
								getTick: GetTick<Tick>,
								options: Partial<Options<Tick>> = {} ){
		
		if( !parentElement ){
			throw new Error('parentElement must be a valid HTMLElement');
		}

		this.parentElement = parentElement;
		this._getTick = getTick;
		this.options = merge( this.options, options );
		
		//__ build dom elements
		this.createElements();

		//__ canvas ticks
		this.canvas = document.createElement( 'canvas' );
		this.elements.canvas = this.canvas;
		Object.assign( this.canvas.style, {
			display: 'block', pointerEvents: 'none',
		} );
		
		const ctx = this.canvas.getContext( '2d' );
		if( !ctx ){
			throw new Error( 'Invalid canvas context' );
		}
		this.ctxTicks = ctx;
		// console.log('ctx', this.ctxTicks );
		this.setCanvasOptions( this.options.canvas );
		this.elements.candles.append( this.canvas );
		this.ctxTicks.lineWidth = 1;
		
		//__ scales
		this.tickWidth = this.options.tickWidth;
		this.tickWidthHalf = this.tickWidth / 2;
		this.scalingX = new ScalingLinear( { min: 0, max: 100 }, { min: 0, max: this.width }, {
			precisionIn: this.tickStep,
			scaleInMax: () => this.updateTickIndexMax(),
			// scaleInMin: () => this.getTickIndexMin(),
		} );
		this.scalingY = new ScalingLinear( { min: 0, max: 100 },
			{ min: this.height-this.options.autoScaleYMargin, max: this.options.autoScaleYMargin },
			this.options.scaleY );
		//__ ui scales
		this.uiScaleX = new UiScale( this.elements.scaleX, 'x', this.scalingX, {
			minLabelDist: 80,
			// stepIncreaseMult: .5,
			...this.options.uiScaleX,
			onChange: ( scaling, emitter ) => {
				this.setScaleX( scaling.scaleIn, { fromUI: true } );
			},
			onDoubleClick: ( scaling, emitter ) => {
				this.autoScaleX();
			},
		} );
		this.uiScaleY = new UiScale( this.elements.scaleY, 'y', this.scalingY, {
			minLabelDist: 35,
			...this.options.uiScaleY,
			onChange: ( scaling, emitter ) => {
				this.options.autoScaleY = false;
				this.setScaleY( scaling.scaleIn );
			},
			onDoubleClick: ( scaling, emitter ) => {
				this.options.autoScaleY = true;
				this.autoScaleY();
			},
			// labelPrecision: .01,
		} );

		//___ events
		this.mouseElement = this.elements.mouseArea;
		this.mouseElement.style.cursor = 'crosshair';
		this.mouseElement.addEventListener( 'mouseenter', this.onMouseEnterChart );
		this.mouseElement.addEventListener( 'mouseleave', this.onMouseLeaveChart );
		this.mouseElement.tabIndex = 0;
		this.mouseElement.addEventListener( 'mousedown', this.onMouseDown );
		this.mouseElement.addEventListener( 'keydown', this.onKeyDown );
		if( this.options.wheelScroll ){
			this.mouseElement.addEventListener( 'wheel', this.onMouseWheel, { passive: false } );
		}
		document.addEventListener( 'mouseup', this.onMouseUp );
		document.addEventListener( 'mousemove', this.onMouseMove );
		window.addEventListener('resize', this.onResize );

		//__
		this.resizeCanvas();

		//__
		this.indicatorSelection = new IndicatorSelection({
			parentElement: this.parentElement,
			indicators: this.options.indicators,
			onUpdate: ( indicator ) => {
				this.addIndicator( new indicator() );
				this.refresh();
			},
		});
		
		this.indicatorSettings = new IndicatorSettings({
			parentElement: this.parentElement,
			onUpdate: ( indicator, changes ) => {
				indicator.setOptions( changes );
				if( indicator.id ){
					if( !this.indicatorsOptions[ indicator.id ] ){
						this.indicatorsOptions[ indicator.id ] = {};
					}
					Object.assign( this.indicatorsOptions[ indicator.id ], changes );
					localStorage.setItem('chart.indicators', JSON.stringify( this.indicatorsOptions));
					// console.log( 'changes', changes, this.indicatorsOptions[ indicator.id ] );
				}
				const index = this.layers.indexOf( indicator );
				if( index !== -1 ){
					const header = this.layersHeader[index];
					header.update();
				}
				
				this.render();
			},
		});
		
		const indicatorsOptions = localStorage.getItem('chart.indicators');
		if( indicatorsOptions ){
			try {
				this.indicatorsOptions = JSON.parse( indicatorsOptions );
			}catch(err ){
				console.warn('Unable to parse localStorage "indicators"', err);
			}
		}
		
		//__
		return this;
	}
	
	indicatorsCount(){
		return this.chartRows.length + this.layers.length;
	}

	addIndicator<I extends Base> ( indicator: I ){
		indicator.setTickStep( this.tickStep );
		indicator.id = `${indicator.constructor.name}-${this.indicatorsCount()}`;
		const opts = this.indicatorsOptions[indicator.id];
		if( opts ){
			indicator.setOptions( opts );
		}

		switch ( indicator.displayMode ){
			case 'row':{
				const row = new ChartRow( this, this.chartRows.length, indicator, this.tickIndexValue, this.elements.main,
					this.scalingX, this.ctxTicks, this.scalingY,
					( scaling, row ) => {
						this.render();
					},
					{
						...this.options.chartRow,
						onMouseEnter: ( event, emitter ) => {
							this.mouseIndicator = emitter;
							this.onMouseEnterChart( event );
						},
						onMouseLeave: ( event ) => {
							this.mouseIndicator = null;
							this.onMouseLeaveChart( event );
						},
						onMouseDown: ( event, emitter ) => {
							this.mouseDragIndicator = emitter;
							this.onMouseDown( event );
						},
						onMouseWheel: this.onMouseWheel,
					} );

				this.chartRows.push( row );
				break;
			}
			case 'layer':{
				indicator.setContext( this.tickIndexValue, this.ctxTicks, this.scalingY, this.scalingX, this.ctxTicks, this.scalingY );
				const index = this.layers.length;
				this.layers[index] = indicator;
				this.layersHeader[index] = new IndicatorHeader<Base>( this.elements.idcsInfos, this.parentElement, indicator, {
					onOpenSettings: this.displayIndicatorSettings,
					onRemove: this.removeIndicator,
					onActivate: this.activateIndicator,
				} );
				this.elements.rowIdcCount.innerText = `${ index+1 }`;
				break;
			}
			default:
				break;
		}

		this.resizeCanvas();

		return this;
	}
	
	activateIndicator = <I extends Base> ( indicator: I, isActive: boolean ) => {
		indicator.setActive( isActive );
		this.onResize();
		this.refresh();
	}
	
	removeIndicator = <I extends Base> ( indicator: I ) => {
		switch ( indicator.displayMode ){
			case 'row':{
				const row = this.chartRows.find( item => item.getIndicator() === indicator );
				if( !row ){return;}
				row.remove();
				this.onResize();
				break;
			}
			case 'layer':{
				const index = this.layers.indexOf( indicator );
				if ( index === -1 ){	return;}
				this.layers.splice( index, 1 );
				this.layersHeader[index].remove();
				this.layersHeader.splice( index, 1 );
				this.elements.rowIdcCount.innerText = `${ this.layers.length }`;
				break;
			}
		}
		this.refresh();
	}
	
	displayIndicatorSettings = <I extends Base>( indicator: I ) => {
		this.indicatorSettings.display( indicator, true );
	}

	beforeDestroy (){
		this.uiScaleX.beforeDestroy();
		this.uiScaleY.beforeDestroy();
		this.mouseElement.removeEventListener( 'mouseenter', this.onMouseEnterChart );
		this.mouseElement.removeEventListener( 'mouseleave', this.onMouseLeaveChart );
		this.mouseElement.removeEventListener( 'mousedown', this.onMouseDown );
		this.mouseElement.removeEventListener( 'keydown', this.onKeyDown );
		this.mouseElement.removeEventListener( 'wheel', this.onMouseWheel );
		document.removeEventListener( 'mouseup', this.onMouseUp );
		document.removeEventListener( 'mousemove', this.onMouseMove );
		window.removeEventListener( 'resize', this.onResize );
		
		this.mouseEnterLeaveListeners.clear();
		this.mouseMoveListeners.clear();
		this.mouseDownUpListeners.clear();

		this.chartRows.forEach( row => {
			row.beforeDestroy();
		} );
		
		Dialog.beforeDestroy();
		InputBase.beforeDestroy();
		Popover.beforeDestroy();
		IndicatorHeader.beforeDestroy();
	}

	refresh (){
		this.chartRows.forEach( row => {
			row.getIndicator().reset();
		} );
		this.layers.forEach( indicator => {
			indicator.reset();
		} );
		this.updateX( true, true );
	}
	
	getElement( key: keyof Chart<Tick>['elements'] ){
		return this.elements[key];
	}
	
	getMouseElement(){
		return this.mouseElement;
	}
	
	setEnabledCrossHair( enabled: boolean ){
		this.enabledCrossHair = enabled;
		this.elements.cross.style.display = this.enabledCrossHair ? 'block' : 'none';
		return this;
	}
	
	getTick = ( index: number, delta = 0 ) => {
		const _index = index - delta * this.tickStep;
		return this._getTick( _index );
	}
	
	getTickIndexMax(){
		return this.options.tickIndexMax?.() || Infinity;
	}

	getTickIndexMin(){
		return this.options.tickIndexMin?.() || -Infinity;
	}

	setTickStep( tickStep: number, { render = true, xOriginRatio = 0, tickStepDelta }
				: { render?: boolean, xOriginRatio?: number, tickStepDelta?: number } = {} ){
		this.tickStep = tickStep;

		// console.log('setTickStep', { tickStep, tickStepDelta });
		if ( tickStepDelta ){
			this.tickStepDelta = tickStepDelta;
		}

		this.scalingX.setOption( 'precisionIn', this.tickStep );
		const dw = this.width * this.tickStep;
		this.scalingX.setDistInMax( dw );// force min tick width 1px
		this.scalingX.setDistInMin( dw / 50 );// force max tick width px ( divider ) 
		this.chartRows.forEach( row => {
			row.getIndicator().setTickStep( this.tickStep );
		});
		this.layers.forEach( indicator => {
			indicator.setTickStep( this.tickStep );
		});
		this.setX( this.scalingX.scaleIn.min, { render, force: render, xOriginRatio } );
	}
	
	setTickStepDelta( opts: { render?: boolean, xOriginRatio?: number, tickStepDelta?: number } = {} ){
		this.setTickStep( this.tickStep, opts);
	}

	//__ x
	setMaxDisplayX( x: number | null, render = false ){
		this.maxDisplayX = x;
		this.updateTickIndexMax();
		this.updateX( render, render );
		return this;
	}
	
	private updateTickIndexMax(){
		this.tickIndexMax = Infinity;
		if ( this.options.tickIndexMax ){
			this.tickIndexMax = this.options.tickIndexMax() + this.tickStepDelta;
		}
		if ( this.maxDisplayX ){
			this.tickIndexMax = Math.min( this.tickIndexMax, this.maxDisplayX );
		}
		return this.tickIndexMax;
	}
	
	translateX( delta: number, options?: { render?: boolean, xOriginRatio?: number, force?: boolean } ){
		if( !delta ){ return;}
		this.setX( this.scalingX.scaleIn.min + delta, options );
		return this;
	}

	setX( x: number, { render = true, xOriginRatio = 0, force = false } = {} ){
		const scale = { min: x, max: x+this.width/this.tickWidth*this.tickStep };
		const d = xOriginRatio * ( scale.max - scale.min );
		scale.min -= d;
		scale.max -= d;
		this.uiScaleX.setScaleIn( scale );

		// console.log( 'setX', { x, scale, scalingX: this.scalingX, xOriginRatio, render, force } );

		this.updateX( render, force );

		return this;
	}

	autoScaleX( render = true ){
		this.tickWidth = this.options.tickWidth;
		this.tickWidthHalf = this.tickWidth / 2;
		this.setX( this.scalingX.scaleIn.min+this.scalingX.distIn*.5, { render, force: true, xOriginRatio:.5 } );
		return this;
	}

	setScaleX( scale: Scale, { render = true, force = false, fromUI = false } = {} ){

		if ( !fromUI ){
			this.uiScaleX.setScaleIn( scale );
		}

		this.tickWidth = Math.max( 1, this.scalingX.scaleTo( this.scalingX.scaleIn.min + this.tickStep, 0 ) );
		// console.log('___ setScaleX', this.scalingX.scaleIn.min, this.tickStep, this.tickWidth );
		this.tickWidthHalf = this.tickWidth / 2;
		this.updateX( render, force );
	}

	private updateX( render = true, force = false ){

		this.cx = this.scalingX.distIn / this.scalingX.distOut;

		let changed = false;
		const xStart = this.tickStepDelta + Math.floor( this.scalingX.scaleIn.min / this.tickStep ) * this.tickStep;
		const xEnd = this.tickStepDelta + Math.ceil( this.scalingX.scaleIn.max / this.tickStep ) * this.tickStep;
		if ( force || xStart !== this.xStart || xEnd !== this.xEnd ){
			this.xStart = xStart;
			this.xEnd = xEnd;
			changed = true;
		}
		this.maxRenderX = Math.min( this.xEnd, this.tickIndexMax );

		this.elements.buttonGoMaxX.style.visibility = this.scalingX.scaleIn.max < Date.now() ? 'visible' : 'hidden';
		
		// console.log( 'updateX', this.xStart, this.options.crossHairLabelX( this.xStart ), scale, this.options.crossHairLabelX( scale.min ) );

		requestAnimationFrame( this._updateX.bind( this, changed, render ) );

		return this;
	}
	
	_updateX( update: boolean, render: boolean ){
		// console.log('_updateX', { update, render });
		if ( update ){
			this.autoScaleY( false );
			const opts = {};
			// console.log('### updateX', new Date( this.xStart).toUTCString(), new Date( this.xEnd ).toUTCString() );
			this.chartRows.forEach( row => {
				row.setViewXMinMax( this.xStart, this.maxRenderX, opts );
			} );
			this.layers.forEach( indicator => {
				indicator.setViewXMinMax( this.xStart, this.maxRenderX, opts );
			} );
		}

		if ( render ){
			this.render();
		}
	}

	//__ y
	translateY( delta: number, options?: { render?: boolean, yOriginRatio?: number } ){
		if ( !delta ){	return;}
		this.setY( this.scalingY.scaleIn.min + delta, options );
		return this;
	}

	setY( y: number, { render = true, yOriginRatio = 0 } = {} ){
		//__ TODO: yOriginRatio
		this.setScaleY( { min: y, max: y + this.scalingY.distIn }, render );
		return this;
	}

	autoScaleY( render = true ){
		if ( this.options.autoScaleY ){
			this.setScaleY( this.getMinMaxY(), render );
		}
		return this;
	}

	setScaleY( scale: Scale, render = true ){
		if( this.scalingY.setScaleIn( scale ) ){
			this.uiScaleY.setScaleIn( scale );
		}
		this.cy = this.scalingY.distIn / this.scalingY.distOut;
		// console.log( 'scaleY', scale, this.cy );

		if ( render ){
			this.render();
		}

		return this;
	}

	getMinMaxY(): MinMax {

		let min: number = Infinity;
		let max: number = -Infinity;
		let t = this.xStart;
		let tick: ReturnType<GetTick<Tick>>;

		while( t <= this.maxRenderX ){
			tick = this.getTick( t );
			min = Math.min( min, +this.tickValue( tick, 'low' ) );
			max = Math.max( max, +this.tickValue( tick, 'high' ) );
			t += this.tickStep;
		}

		if( max - min === 0 ){			max += 10;}

		// console.log( '//_________ getMinMaxY', { min, max }, new Date( this.xStart ).toUTCString() );

		return { min, max };
	}

	//__
	setCanvasOptions( options: Options<Tick>['canvas'] ){
		// console.log('setCanvasOptions', options );
		Object.assign( this.ctxTicks, options );
	}
	
	render( xStart: number = this.xStart, xEnd: number = this.xEnd ){
		if( xEnd < this.xStart || xStart > this.xEnd ){ return;}
		const _xStart = Math.max( xStart, this.xStart );
		let _xEnd = Math.min( xEnd, this.xEnd );

		const xPx = this.scalingX.scaleTo( _xStart );
		const wPx = ( _xEnd-_xStart ) / this.scalingX.distIn * this.scalingX.distOut;
		this.clearRect( xPx, wPx );
		this.chartRows.forEach( ( row ) => {
			row.clearRect( xPx, wPx );
		} );

		// console.log( 'render', { /*xStart,*/ _xStart, /*xEnd,*/ _xEnd, xPx, wPx,
		// 	scalingX: this.scalingX } );

		// _xStart = Math.max( _xStart, this.getTickIndexMin() );
		_xEnd = Math.min( _xEnd, this.maxRenderX );

		// console.log( '//_________ render', { _xStart: new Date( _xStart ).toUTCString()} );
		let x = _xStart;
		while ( x <= _xEnd ){
			const tick = this.getTick( x );
			if( !this.options.isDefaultTick( tick )){
				this.drawTick( x, tick );
			}
			x += this.tickStep;
		}
	}

	clearRect( x: number, w: number ){
		this.ctxTicks.clearRect( x, 0, w, this.canvas.height );
	}

	drawTickClear ( index: number, tick: Tick ){
		const xPos = this.scalingX.scaleTo( index );
		this.clearRect( xPos, this.tickWidth );
		this.drawTick( index, tick );
	}
	
	drawTick( index: number, tick: Tick ){

		const xPos = this.scalingX.scaleTo( index );
		
		this.layers.forEach( indicator => {
			indicator.drawTick( xPos, this.tickWidth, index );
		} );

		//___
		const ctx = this.ctxTicks;
		const isDown = +this.tickValue( tick,'close' ) < +this.tickValue( tick, 'open' );
		const col = isDown ? this.options.candle.color.down : this.options.candle.color.up;
		
		//__ wick
		ctx.strokeStyle = col;
		ctx.beginPath();
		const xWick = sharpCanvasValue( xPos + this.tickWidthHalf, .5 );//__ canvas 1px line need .5 pos

		ctx.moveTo( xWick, this.scalingY.scaleTo( this.tickValue( tick, 'high' ) ) );
		ctx.lineTo( xWick, this.scalingY.scaleTo( this.tickValue( tick, 'low' ) ) );
		ctx.stroke();
		
		//__ body
		ctx.fillStyle = col;
		const yOpen = this.scalingY.scaleTo( this.tickValue(tick, 'open') );
		const yClose = this.scalingY.scaleTo( this.tickValue( tick, 'close' ) );
		const xBody = sharpCanvasValue( xPos );
		ctx.fillRect( xBody, isDown ? yOpen : yClose, this.tickWidth, Math.max( 1, Math.abs( yClose - yOpen ) ) );

		//___
		this.chartRows.forEach( row => {
			row.getIndicator().drawTick( xPos, this.tickWidth, index );
		} );

		//console.log( 'drawTick', { isDown, xWick, xBody }, tick );
	}
	
	tickValue( tick: Tick, prop: TickProp ) {
		return tick[ this.options.mapTickProps[ prop ] ];
	}

	tickIndexValue = ( index: number, prop: TickProp, delta = 0 ) => {
		return this.tickValue( this.getTick( index, delta ), prop );
	}

	readonly mouseEnterLeaveListeners: ListenerEventFactory<( inside: boolean, event: MouseEvent ) => void>
		= new ListenerEventFactory();

	readonly mouseMoveListeners: ListenerEventFactory<( xValue: number, yValue: number, x: number, event: MouseEvent ) => void>
		= new ListenerEventFactory();

	readonly mouseDownUpListeners: ListenerEventFactory<( isDown: boolean, event: MouseEvent ) => void>
		= new ListenerEventFactory();

	private onMouseEnterChart = ( event: MouseEvent ) => {
		event.stopImmediatePropagation();
		this.mouseOverChart = true;
		if ( this.enabledCrossHair ){
			this.elements.cross.style.display = 'block';
		}
		this.elements.labelX.style.display = 'block';
		this.elements.labelY.style.display = 'block';
		this.mouseEnterLeaveListeners.dispatch( true, event );
	}

	private onMouseLeaveChart = ( event: MouseEvent ) => {
		event.stopImmediatePropagation();
		this.mouseOverChart = false;
		if ( this.enabledCrossHair ){
			this.elements.cross.style.display = 'none';
		}
		this.elements.labelX.style.display = 'none';
		this.elements.labelY.style.display = 'none';
		this.mouseEnterLeaveListeners.dispatch( false, event );
	}

	private onMouseDown = ( event: MouseEvent ) => {
		// event.stopImmediatePropagation();//__ avoid any sub mousedown
		if ( event.button === 0 ){
			this.position = { x: event.clientX, y: event.clientY };
			this.drag = true;
			document.body.style.userSelect = 'none';
			this.mouseDownUpListeners.dispatch( true, event );
		}
	}

	private onMouseUp = ( event: MouseEvent ) => {
		this.drag = false;
		this.mouseDragIndicator = null;
		this.update();
		document.body.style.userSelect = 'auto';
		this.mouseDownUpListeners.dispatch( false, event );
	}

	private moveEvent: MouseEvent | null = null;
	private position: { x: number, y: number } = { x: 0, y: 0 };

	private onMouseMove = ( event: MouseEvent ) => {
		this.moveEvent = event;
		requestAnimationFrame( this.update );
	}

	private wheelEvent: WheelEvent | null = null;
	private onMouseWheel = ( event: WheelEvent ) => {
		if( !this.options.wheelScroll ){
			return;
		}
		event.preventDefault();
		this.wheelEvent = event;
		requestAnimationFrame( this.update );
	}

	private onKeyDown = ( event: KeyboardEvent ) => {
		// console.log('onKeyDown', event.keyCode, event );
		//__ TODO: use requestAnimationFrame + refacto all move events with vx / vy + fix autoScale false when !!vy
		let v = this.options.keyboard.vx;
		if ( event.shiftKey ){
			v *= 10;
		}
		switch ( event.keyCode ){
			default:
				break;
			case 37:{//_ left
				this.translateX( -v * this.scalingX.distIn );
				break;
			}
			case 39:{//_ right
				this.translateX( v * this.scalingX.distIn );
				break;
			}
			case 38:{//_ up
				this.translateY( v * this.scalingY.distIn );
				break;
			}
			case 40:{//_ down
				this.translateY( -v * this.scalingY.distIn );
				break;
			}
			case 27:{//_ escape
				if ( document.activeElement instanceof HTMLElement ){
					document.activeElement.blur();
				}
				break;
			}
		}
	}
	
	private onResize = () => {
		this.resizing = true;
		requestAnimationFrame( this.update );
	}
	
	private update = () => {
		let render = false;

		if ( this.resizing ){
			this.resizing = false;
			if ( this.resizeCanvas() ){
				render = true;
			}
		}else if ( this.moveEvent ){
			const event = this.moveEvent;
			this.moveEvent = null;

			if ( this.mouseOverChart ){
				//__ crosshair
				const x = this.tickStepDelta + this.scalingX.scaleToInv( event.offsetX - this.tickWidthHalf );
				const tick = this.getTick( x );
				if ( x <= this.tickIndexMax ){
					Object.keys( this.infosLabels ).forEach( key => {
						const kv = `info-${ key }-value`;
						this.elements[ kv ].innerText = `${ +tick[ key ] }`;
					} );
					this.elements.infos.style.display = 'flex';
				} else {
					this.elements.infos.style.display = 'none';
				}
				const xValue = Math.floor( this.scalingX.scaleTo( x ) + this.tickWidthHalf );
				this.elements.crossX.style.transform = `translateX(${ xValue }px)`;
				this.elements.labelX.innerText = ( this.options.crossHairLabelX || this.uiScaleX.options.formatLabel )( x );
				const px = Math.round(
					Math.min(
						Math.max( xValue - this.elements.labelX.clientWidth / 2, 0 )
						, this.width - this.elements.labelX.clientWidth ) );
				this.elements.labelX.style.transform = `translateX(${ px }px)`;

				const target = event.target as ElementRect;
				let yPos = event.offsetY;
				const hLabel = Math.ceil( this.elements.labelY.clientHeight );
				let yLabel = Math.ceil(
					Math.min(
						Math.max( yPos - hLabel / 2, 0 )
						, ( target.rect?.height || 0 ) - hLabel ) );
				let yValue = 0;

				if ( this.mouseIndicator ){
					const d = Math.floor( ( target.rect?.y || 0 ) - ( this.mouseElement.rect?.y || 0 ) );
					yPos += d;
					yLabel += d;
					yValue = this.mouseIndicator.scalingY.scaleToInv( event.offsetY );
				} else {
					yValue = this.scalingY.scaleToInv( yPos );
				}
				this.elements.crossY.style.transform = `translateY(${ yPos }px)`;
				this.elements.labelY.innerText = isNaN( yValue )
					? '--'
					: ( this.options.crossHairLabelY || this.uiScaleY.options.formatLabel )( yValue );
				this.elements.labelY.style.transform = `translateY(${ Math.round( yLabel ) }px)`;

				this.mouseMoveListeners.dispatch( xValue, yValue, x, event );
			}

			if ( this.drag ){
				//__ y
				const autoScaleY = this.mouseDragIndicator ? this.mouseDragIndicator.options.autoScaleY : this.options.autoScaleY;
				if ( !autoScaleY ){
					const cy = this.mouseDragIndicator ? this.mouseDragIndicator.cy : this.cy;
					const vy = ( this.position.y - event.clientY ) * cy;
					this.position.y = event.clientY;
					if ( vy !== 0 ){
						if ( this.mouseDragIndicator ){
							this.mouseDragIndicator.translateY( vy );
						} else {
							this.translateY( vy, { render: false } );
						}
						render = true;
					}
				}

				const vx = ( this.position.x - event.clientX ) * this.cx;
				this.position.x = event.clientX;
				if ( vx !== 0 ){
					render = false;
					this.translateX( vx );
				}
			}
		}else if( this.wheelEvent ){
			const scale = { ...this.scalingX.scaleIn };
			const dx = this.wheelEvent.deltaX * this.scalingX.distIn * .001;
			scale.min += dx;
			scale.max += dx;
			const dy = this.wheelEvent.deltaY * this.scalingX.distIn * .0001;
			scale.min -= dy;
			scale.max += dy;
			this.setScaleX( scale, { render: false } );
			this.wheelEvent = null;
			render = true;
		}

		if ( render ){
			this.render();
		}

	}

	private resizeCanvas (){

		const resized = resizeCanvas( this.canvas );

		if ( resized ){
			this.width = resized.width;
			this.height = resized.height;
			const dw = this.width * this.tickStep;
			this.scalingX.setDistInMax( dw );// force min tick width 1px
			this.scalingX.setDistInMin( dw / 50 );// force max tick width px ( divider ) 
			this.mouseElement.rect = this.mouseElement.getBoundingClientRect();
			this.uiScaleX.setScaleOut( { min: 0, max: resized.width } );
			this.uiScaleY.setScaleOut( {
				min: resized.height - this.options.autoScaleYMargin,
				max: this.options.autoScaleYMargin
			} );
		}

		this.chartRows.forEach( row => {
			row.resizeCanvas();
		} );

		return resized;
	}

	private createElements (){
		Object.assign( this.parentElement.style, {
			display: 'flex',
			'flex-direction': 'column',
			overflow: 'hidden',
		} );
		//____ main
		this.elements.main = createElement( 'div', {
			relativeElement: this.parentElement,
			className: 'main',
			style: {
				flex: '1 1',
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'stretch',
				overflow: 'hidden',
			}
		} );
		//____ row Candles
		this.elements.rowCandles = createElement( 'div', {
			relativeElement: this.elements.main,
			className: 'row-candles',
			style: {
				flex: '1 1',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'stretch',
				overflow: 'hidden',
			}
		} );
		this.elements.candles = createElement( 'div', {
			relativeElement: this.elements.rowCandles,
			className: 'candles',
			style: {
				flex: '1 1', position: 'relative', overflow: 'hidden',
			}
		} );
		this.elements.scaleY = createElement( 'div', {
			relativeElement: this.elements.rowCandles,
			className: 'scale scale-y',
			style: {
				borderLeft: this.border,
				width: `${ this.options.yScaleWidth }px`,
				color: '#cccccc',
			}
		} );
		//____ foot
		this.elements.foot = createElement( 'div', {
			relativeElement: this.parentElement,
			className: 'foot',
			style: {
				height: '24px',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'stretch',
				borderTop: this.border,
			}
		} );
		//____ scaleX
		this.elements.scaleX = createElement( 'div', {
			relativeElement: this.elements.foot,
			className: 'scale scale-x',
			style: {
				flex: '1 1',
				color: '#cccccc',
			}
		} );
		//____ foot corner
		this.elements.corner = createElement( 'div', {
			relativeElement: this.elements.foot,
			className: 'corner',
			style: {
				width: `${ this.options.yScaleWidth }px`,
				borderLeft: this.border,
			}
		} );
		//____ mouse area: main without yScale
		this.elements.mouseArea = createElement( 'div', {
			relativeElement: this.elements.main,
			className: 'mouse-move-area',
			style: {
				display: 'block', zIndex: '90', position: 'absolute', cursor: 'crosshair',
				left: '0', top: '0', bottom: '0', right: this.elements.scaleY.style.width,
			}
		} );
		//__ cross
		const crossBorder = '1px solid #ffffff33';
		this.elements.cross = createElement( 'div', {
			relativeElement: this.elements.main,
			className: 'cross',
			style: {
				display: 'none', position: 'absolute', inset: `0 ${ this.elements.scaleY.style.width } 0 0`, zIndex: '95',
				pointerEvents: 'none',
			}
		} );
		//____ cross x
		this.elements.crossX = createElement( 'div', {
			relativeElement: this.elements.cross,
			className: 'cross-x',
			style: {
				display: 'block',
				position: 'absolute', top: '0', bottom: '0', left: '0',
				borderLeft: crossBorder,
			}
		} );
		//____ cross y
		this.elements.crossY = createElement( 'div', {
			relativeElement: this.elements.cross,
			className: 'cross-y',
			style: {
				display: 'block',
				position: 'absolute', left: '0', right: '0', top: '0',
				borderTop: crossBorder,
			}
		} );
		//_______ cross labels
		const crossLabelStyle = {
			display: 'none', background: '#2C2C2C', color: '#ffffff', padding: '0 8px', overflow: 'hidden', zIndex: '96',
			fontWeight: '400',
			position: 'absolute', top: '0',
		};
		this.elements.labelX = createElement( 'div', {
			relativeElement: this.elements.scaleX,
			className: 'cross-label-x',
			style: {
				...crossLabelStyle,
				left: '0', height: this.elements.foot.style.height,
			}
		} );
		this.elements.labelY = createElement( 'div', {
			relativeElement: this.elements.main,
			innerText: '0',
			className: 'cross-label-y',
			style: {
				...crossLabelStyle,
				right: '0', width: this.elements.scaleY.style.width,
			}
		} );
		this.elements.labelY.style.marginTop = `${ -Math.round( this.elements.labelY.clientHeight / 2 ) }px`;
		//____ infos
		this.elements.infos = createElement( 'div', {
			relativeElement: this.elements.candles,
			className: 'tick-infos',
		} );
		Object.entries( this.infosLabels ).forEach( ( [ key, label ] ) => {
			const k = `info-${ key }`;
			this.elements[ k ] = createElement( 'div', {
				relativeElement: this.elements.infos,
				className: `tick-info ${k}`,
			} );
			this.elements[ k ].innerText = `${ label }:`;

			const kv = `${ k }-value`;
			this.elements[ kv ] = createElement( 'div', {
				relativeElement: this.elements[ k ],
				className: `tick-info-value ${kv}`,
			} );
		} );
		//____ indicator settings
		this.elements.idcsBar = createElement('div', {
			relativeElement: this.elements.candles,
			className: 'idcs-bar',
		});
		this.elements.btToggleIdcsSettings = createElement('button', {
			relativeElement: this.elements.idcsBar,
			className: 'bt-toggle-display',
			icon: { className: 'chevron-down' },
			events: {
				'click': () => {
					const display = this.elements.idcsInfos.style.display === 'none';
					this.elements.idcsInfos.style.display = display ? 'flex' : 'none';
					if( this.elements.btToggleIdcsSettingsIcon ){
						this.elements.btToggleIdcsSettingsIcon.style.transform = `rotate(${ display ? 0 : 180}deg)`;
					}
				}
			}
		});
		this.elements.btToggleIdcsSettingsIcon = this.elements.btToggleIdcsSettings.querySelector( '.icon' ) as HTMLElement;
		this.elements.rowIdcCount = createElement('div', {
			relativeElement: this.elements.btToggleIdcsSettings,
			relativePosition: 'prepend',
			innerText: '0',
		});
		this.elements.idcsInfos = createElement('div', {
			relativeElement: this.elements.idcsBar,
			className: 'col idcs-infos',
			style: {
				display: 'none',
			}
		});

		//___ toolbar top
		this.elements.toolbarTop = createElement( 'div', {
			relativeElement: this.elements.candles,
			className: 'toolbar toolbar-top',
		} );

		createElement( 'button', {
			relativeElement: this.elements.toolbarTop,
			className: 'btn small',
			attr: { title: 'Add sindicator...' },
			icon: { className: 'chart-line' },
			events: {
				click: () => {
					this.indicatorSelection.diplay();
				}
			}
		} );

		//__ options elements
		if ( this.options.uiElements.buttonGoMaxX ){
			if ( this.options.uiElements.buttonGoMaxX === true ){
				this.elements.buttonGoMaxX = createElement( 'button', {
					attr: {
						title: 'Scroll X to max',
					},
					relativeElement: this.elements.candles,
					style: {
						position: 'absolute', bottom: '1px', right: '1px', zIndex: '150', padding: '4px',
					},
					icon: {
						className: 'icon ic-chevron-double-right',
					}
				} );
			} else {
				this.elements.buttonGoMaxX = this.elements.candles.appendChild( this.options.uiElements.buttonGoMaxX );
			}
			this.elements.buttonGoMaxX.addEventListener( 'click', () => {
				this.setX( Date.now(), { render: true, xOriginRatio: .75 } );
			} );
		}
	}
}

