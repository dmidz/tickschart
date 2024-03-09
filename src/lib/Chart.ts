
import merge from './utils/merge.ts';
import { ScalingLinear, type Scale, type ScalingLinearOptions } from './utils/math.ts';
import UiScale, { type Options as UiScaleOptions } from './UiScale.ts';
import { addListenerFactory, removeListenerFactory, createElement, resizeCanvas, sharpCanvasValue,
	type CandleTick, type GetTick, type ElementRect, type TickProp, type AbstractTick } from './index.ts';
import indicators, { type List, type Indicator } from './Indicator/index.ts';
import ChartRow, { Options as ChartRowOptions } from './ChartRow.ts';

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
	readonly tickIndexMax: ( () => number ) | null,
	uiElements: {
		buttonGoMaxX?: boolean | HTMLElement,
	},
	chartRow: ChartRowOptions,
	mapTickProps: { [key in TickProp]: keyof Tick},
}

export default class Chart<Tick extends AbstractTick = CandleTick> {

	private parentElement: HTMLElement;
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
		autoScaleYMargin: 10,// px
		yScaleWidth: 100,
		wheelScroll: true,
		tickIndexMax: () => {
			return Math.ceil( Date.now() / this.tickStep ) * this.tickStep;
		},
		uiElements: {
			buttonGoMaxX: true,
		},
		chartRow: {},
		mapTickProps: { open: 'open', high: 'high', low: 'low', close: 'close', volume: 'volume' },
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
	private chartRows: ChartRow[] = [];
	private mouseEnterElement: ElementRect;
	private mouseMoveElement: HTMLElement;
	private mouseIndicator: ChartRow | null = null;
	private mouseDragIndicator: ChartRow | null = null;
	private layers: Indicator[] = [];

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
		this.createDomElements();

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
			scaleInMax: this.options.tickIndexMax,
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
		this.mouseEnterElement = this.elements.candles;
		this.mouseEnterElement.addEventListener( 'mouseenter', this.onMouseEnterChart );
		this.mouseEnterElement.addEventListener( 'mouseleave', this.onMouseLeaveChart );
		this.mouseMoveElement = this.elements.candles;
		this.mouseMoveElement.tabIndex = 0;
		this.mouseMoveElement.addEventListener( 'mousedown', this.onMouseDown );
		this.mouseMoveElement.addEventListener( 'keydown', this.onKeyDown );
		if( this.options.wheelScroll ){
			this.mouseMoveElement.addEventListener( 'wheel', this.onMouseWheel );
		}
		document.addEventListener( 'mouseup', this.onMouseUp );
		document.addEventListener( 'mousemove', this.onMouseMove );
		window.addEventListener('resize', this.onResize );

		this.resizeCanvas();
		//__
		return this;
	}

	addIndicator<K extends keyof List> ( type: K, mode: 'layer'|'row' = 'row',
		...params: ConstructorParameters<List[K]> ){
		// @ts-ignore
		const indicator = new indicators[ type ]( ...params );
		indicator.setTickStep( this.tickStep );
		
		switch( mode ){
			case 'row': {
				const row = new ChartRow( this.chartRows.length, indicator, this.tickIndexValue, this.elements.main,
					this.scalingX, this.ctxTicks, this.scalingY,
					( scaling, row ) => {
						this.render( undefined, undefined, row );
					},
					{
						...this.options.chartRow,
						onMouseEnter: ( event, chartRow ) => {
							this.mouseIndicator = chartRow;
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
					} );
				this.chartRows.push( row );
				break;
			}
			case 'layer': {
				indicator.setContext( this.tickIndexValue, this.ctxTicks, this.scalingY, this.scalingX, this.ctxTicks, this.scalingY );
				this.layers.push( indicator );
				break;
			}
			default: break;
		}

		this.resizeCanvas();

		return this;
	}

	beforeDestroy (){
		this.uiScaleX.beforeDestroy();
		this.uiScaleY.beforeDestroy();
		this.mouseEnterElement.removeEventListener( 'mouseenter', this.onMouseEnterChart );
		this.mouseEnterElement.removeEventListener( 'mouseleave', this.onMouseLeaveChart );
		this.mouseMoveElement.removeEventListener( 'mousedown', this.onMouseDown );
		this.mouseMoveElement.removeEventListener( 'keydown', this.onKeyDown );
		this.mouseMoveElement.removeEventListener( 'wheel', this.onMouseWheel );
		document.removeEventListener( 'mouseup', this.onMouseUp );
		document.removeEventListener( 'mousemove', this.onMouseMove );
		window.removeEventListener( 'resize', this.onResize );

		this.chartRows.forEach( row => {
			row.beforeDestroy();
		} );
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
	
	getElement( key: keyof Chart['elements'] ){
		return this.elements[key];
	}
	
	getMouseEnterElement(){
		return this.mouseEnterElement;
	}
	
	getMouseMoveElement(){
		return this.mouseMoveElement;
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

	setTickStep( tickStep: number, { render = true, xOriginRatio = 0 } ){
		this.tickStep = tickStep;
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

	//__ x
	setMaxDisplayX( x: number | null, render = false ){
		this.maxDisplayX = x;
		if ( render ){
			this.render();
		}
		return this;
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
		const xStart = Math.floor( this.scalingX.scaleIn.min / this.tickStep ) * this.tickStep;
		const xEnd = Math.ceil( this.scalingX.scaleIn.max / this.tickStep ) * this.tickStep;
		if ( xStart !== this.xStart || xEnd !== this.xEnd ){
			this.xStart = xStart;
			this.xEnd = xEnd;
			changed = true;
		}

		this.elements.buttonGoMaxX.style.display = this.scalingX.scaleIn.max < Date.now() ? 'inline-block' : 'none'; 

		// console.log( 'updateX', this.xStart, this.options.crossHairLabelX( this.xStart ), scale, this.options.crossHairLabelX( scale.min ) );

		const after = () => {
			if ( changed || force ){
				this.autoScaleY( false );
				const opts = { tickIndexMax: this.options.tickIndexMax?.() };
				// console.log('### updateX', new Date( this.xStart).toUTCString(), new Date( this.xEnd ).toUTCString() );
				this.chartRows.forEach( row => {
					row.setViewXMinMax( this.xStart, this.xEnd, opts );
				} );
				this.layers.forEach( indicator => {
					indicator.setViewXMinMax( this.xStart, this.xEnd, opts );
				} );
			}

			if ( render ){
				this.render();
			}
		}

		const p = this.options.onScalingXChange( this.scalingX );

		if ( ( p as Promise<void> )?.then ){
			p.then( after );
		} else {
			after();
		}

		return this;
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
		let xEnd = this.xEnd;
		if ( this.options.tickIndexMax ){
			xEnd = Math.min( this.xEnd, this.options.tickIndexMax() );
		}

		while( t <= xEnd ){
			tick = this.getTick( t );
			// if( !tick._default ){
				min = Math.min( min, +this.tickValue(tick,'low') );
				max = Math.max( max, +this.tickValue(tick,'high') );
			// }
			t += this.tickStep;
		}

		// if( min === Infinity ){			min = 0;}
		// if( max === -Infinity ){		max = 10;}
		if( max - min === 0 ){			max += 10;}

		// console.log( '//_________ getMinMaxY', { min, max }, new Date( this.xStart ).toUTCString() );

		return { min, max };
	}

	//__
	setCanvasOptions( options: Options<Tick>['canvas'] ){
		// console.log('setCanvasOptions', options );
		Object.assign( this.ctxTicks, options );
	}
	
	render( xStart: number = this.xStart, xEnd: number = this.xEnd, row?: ChartRow ){
		if( xEnd < this.xStart || xStart > this.xEnd ){ return;}
		const _xStart = Math.max( xStart, this.xStart );
		let _xEnd = Math.min( xEnd, this.xEnd );

		const xPx = this.scalingX.scaleTo( _xStart );
		const wPx = ( _xEnd-_xStart ) / this.scalingX.distIn * this.scalingX.distOut;
		this.clearRect( xPx, wPx );
		this.chartRows.forEach( ( row ) => {
			row.clearRect( xPx, wPx );
		} );


		// console.log( 'render', { xStart, _xStart, xEnd, _xEnd, xPx, wPx,
		// 	scaleXMin: this.scalingX.scaleIn.min, scaleXMax: this.scalingX.scaleIn.max, distIn: this.scalingX.distIn } );


		//__ TODO: remove maxDisplayX, replaced by tickIndexMax() ( Player should use the latter )
		if ( this.maxDisplayX ){
			_xEnd = Math.min( _xEnd, this.maxDisplayX );
		}
		if( this.options.tickIndexMax ){
			_xEnd = Math.min( _xEnd, this.options.tickIndexMax() );
		}

		// console.log( '//_________ render', { _xStart: new Date( _xStart ).toUTCString(), xStart: new Date( xStart ).toUTCString(), thisxStart: new Date( this.xStart ).toUTCString() } );
		let tick: ReturnType<GetTick<Tick>>;
		let xPos: number;
		let x = _xStart;
		while ( x <= _xEnd ){
			tick = this.getTick( x );
			// if( !tick._default ){
				xPos = this.scalingX.scaleTo( x );
				this.layers.forEach( indicator => {
					indicator.drawTick( xPos, this.tickWidth, x );
				});
				this.drawTick( tick, xPos, this.tickWidth, x );
				this.chartRows.forEach( row => {
					row.getIndicator().drawTick( xPos, this.tickWidth, x );
				} );
			// }
			x += this.tickStep;
		}
	}

	clearRect( x: number, w: number ){
		this.ctxTicks.clearRect( x, 0, w, this.canvas.height );
	}

	drawTick( tick: Tick, x: number, width: number, index: number, debug = false ){
		
		const ctx = this.ctxTicks;
		const isDown = +this.tickValue( tick,'close' ) < +this.tickValue( tick, 'open' );
		const col = isDown ? this.options.candle.color.down : this.options.candle.color.up;
		
		//__ wick
		ctx.strokeStyle = col;
		ctx.beginPath();
		const xWick = sharpCanvasValue( x + this.tickWidthHalf, .5 );//__ canvas 1px line need .5 pos

		ctx.moveTo( xWick, this.scalingY.scaleTo( this.tickValue( tick, 'high' ) ) );
		ctx.lineTo( xWick, this.scalingY.scaleTo( this.tickValue( tick, 'low' ) ) );
		ctx.stroke();
		
		//__ body
		ctx.fillStyle = col;
		const yOpen = this.scalingY.scaleTo( this.tickValue(tick, 'open') );
		const yClose = this.scalingY.scaleTo( this.tickValue( tick, 'close' ) );
		const xBody = sharpCanvasValue( x );
		ctx.fillRect( xBody, isDown ? yOpen : yClose, width, Math.max( 1, Math.abs( yClose - yOpen ) ) );

		// debug && console.log( 'drawTick', { isDown, xWick, xBody }, tick );
	}
	
	tickValue( tick: Tick, prop: TickProp ) {
		return tick[ this.options.mapTickProps[ prop ] ];
	}

	tickIndexValue = ( index: number, prop: TickProp, delta = 0 ) => {
		return this.tickValue( this.getTick( index, delta ), prop );
	}

	private mouseMoveListeners: ( ( x: number, y: number, xOut: number, event: MouseEvent ) => void )[] = [];
	addMouseMoveListener = addListenerFactory( this.mouseMoveListeners );
	removeMouseMoveListener = removeListenerFactory( this.mouseMoveListeners );

	private mouseEnterLeaveListeners: ( ( inside: boolean, event: MouseEvent ) => void )[] = [];
	addMouseEnterLeaveListener = addListenerFactory( this.mouseEnterLeaveListeners );
	removeMouseEnterLeaveListener = removeListenerFactory( this.mouseEnterLeaveListeners );

	private onMouseEnterChart = ( event: MouseEvent ) => {
		event.stopImmediatePropagation();
		this.mouseOverChart = true;
		if ( this.enabledCrossHair ){
			this.elements.cross.style.display = 'block';
		}
		this.elements.labelX.style.display = 'block';
		this.elements.labelY.style.display = 'block';
		this.mouseEnterLeaveListeners.forEach( callback => {
			callback( true, event );
		} );
	}

	private onMouseLeaveChart = ( event: MouseEvent ) => {
		event.stopImmediatePropagation();
		this.mouseOverChart = false;
		if ( this.enabledCrossHair ){
			this.elements.cross.style.display = 'none';
		}
		this.elements.labelX.style.display = 'none';
		this.elements.labelY.style.display = 'none';
		this.mouseEnterLeaveListeners.forEach( callback => {
			callback( false, event );
		} );
	}

	private onMouseDown = ( event: MouseEvent ) => {
		// event.stopImmediatePropagation();//__ avoid any sub mousedown
		if ( event.button === 0 ){
			this.position = { x: event.clientX, y: event.clientY };
			this.drag = true;
			document.body.style.userSelect = 'none';
		}
	}

	private onMouseUp = ( event: MouseEvent ) => {
		this.drag = false;
		this.mouseDragIndicator = null;
		this.update();
		document.body.style.userSelect = 'auto';
	}

	private moveEvent: MouseEvent | null = null;
	private position: { x: number, y: number } = { x: 0, y: 0 };

	private onMouseMove = ( event: MouseEvent ) => {
		this.moveEvent = event;
		requestAnimationFrame( this.update );
	}

	private wheelEvent: WheelEvent | null = null;
	private onMouseWheel = ( event: WheelEvent ) => {
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
	private onResize = ( event: UIEvent ) => {
		// console.log('onResize', event );
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
				//__ x
				const x = this.scalingX.scaleToInv( event.offsetX - this.tickWidthHalf );
				const tick = this.getTick( x );
				if ( !this.maxDisplayX || x < this.maxDisplayX ){
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

				//__ y
				const target = event.target as ElementRect;
				let yPos = event.offsetY;
				const hLabel = Math.ceil( this.elements.labelY.clientHeight );
				let yLabel = Math.ceil(
					Math.min(
						Math.max( yPos - hLabel / 2, 0 )
						, ( target.rect?.height || 0 ) - hLabel ) );
				let yValue = 0;

				if ( this.mouseIndicator ){
					const d = Math.floor( ( target.rect?.y || 0 ) - ( this.mouseEnterElement.rect?.y || 0 ) );
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

				this.mouseMoveListeners.forEach( callback => {
					callback( xValue, yValue, x, event );
				} );
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
			this.mouseEnterElement.rect = this.mouseEnterElement.getBoundingClientRect();
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

	private createDomElements (){
		Object.assign( this.parentElement.style, {
			display: 'flex',
			'flex-direction': 'column',
			overflow: 'hidden',
		} );
		//____ main
		this.elements.main = createElement( 'div', this.parentElement, {
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
		this.elements.rowCandles = createElement( 'div', this.elements.main, {
			className: 'row-candles',
			style: {
				flex: '1 1',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'stretch',
				overflow: 'hidden',
			}
		} );
		this.elements.candles = createElement( 'div', this.elements.rowCandles, {
			className: 'candles',
			style: {
				flex: '1 1', position: 'relative', overflow: 'hidden', cursor: 'crosshair',
			}
		} );
		this.elements.scaleY = createElement( 'div', this.elements.rowCandles, {
			className: 'scale scale-y',
			style: {
				borderLeft: this.border,
				width: `${ this.options.yScaleWidth }px`,
				color: '#cccccc',
			}
		} );
		//____ foot
		this.elements.foot = createElement( 'div', this.parentElement, {
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
		this.elements.scaleX = createElement( 'div', this.elements.foot, {
			className: 'scale scale-x',
			style: {
				flex: '1 1',
				color: '#cccccc',
			}
		} );
		//____ foot corner
		this.elements.corner = createElement( 'div', this.elements.foot, {
			className: 'corner',
			style: {
				width: `${ this.options.yScaleWidth }px`,
				borderLeft: this.border,
			}
		} );
		//__ cross
		const crossBorder = '1px solid #ffffff33';
		this.elements.cross = createElement( 'div', this.elements.main, {
			className: 'cross',
			style: {
				display: 'none', position: 'absolute', inset: `0 ${ this.elements.scaleY.style.width } 0 0`, zIndex: '95',
				pointerEvents: 'none',
			}
		} );
		//____ cross x
		this.elements.crossX = createElement( 'div', this.elements.cross, {
			className: 'cross-x',
			style: {
				display: 'block',
				position: 'absolute', top: '0', bottom: '0', left: '0',
				borderLeft: crossBorder,
			}
		} );
		//____ cross y
		this.elements.crossY = createElement( 'div', this.elements.cross, {
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
		this.elements.labelX = createElement( 'div', this.elements.scaleX, {
			className: 'cross-label-x',
			style: {
				...crossLabelStyle,
				left: '0', height: this.elements.foot.style.height,
			}
		} );
		this.elements.labelY = createElement( 'div', this.elements.main, {
			className: 'cross-label-y',
			style: {
				...crossLabelStyle,
				right: '0', width: this.elements.scaleY.style.width,
			}
		} );
		this.elements.labelY.innerText = '0';
		this.elements.labelY.style.marginTop = `${ -Math.round( this.elements.labelY.clientHeight / 2 ) }px`;
		//____ infos
		this.elements.infos = createElement( 'div', this.elements.main, {
			className: 'infos',
			style: {
				background: '#161616cc', padding: '0 8px',
				position: 'absolute', left: '1px', top: '1px', zIndex: '96',
				display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'flex-start',
			}
		} );
		Object.entries( this.infosLabels ).forEach( ( [ key, label ] ) => {
			const k = `info-${ key }`;
			this.elements[ k ] = createElement( 'div', this.elements.infos, {
				className: k,
				style: {
					display: 'flex', flexDirection: 'row', gap: '4px', justifyContent: 'flex-start',
				}
			} );
			this.elements[ k ].innerText = `${ label }:`;

			const kv = `${ k }-value`;
			this.elements[ kv ] = createElement( 'div', this.elements[ k ], {
				className: kv,
				style: {}
			} );
		} );

		//__ options elements
		if ( this.options.uiElements.buttonGoMaxX ){
			if ( this.options.uiElements.buttonGoMaxX === true ){
				this.elements.buttonGoMaxX = createElement( 'button', this.elements.candles, {
					style: {
						position: 'absolute', bottom: '4px', right: '4px', color: '#222222', display: 'none', zIndex: '999',
						cursor: 'pointer',
					}
				} );
				this.elements.buttonGoMaxX.innerText = '>>';
				this.elements.buttonGoMaxX.title = 'Scroll X to max';
				// console.log('insert buttonGoMaxX', this.elements.buttonGoMaxX );
			} else {
				this.elements.buttonGoMaxX = this.elements.candles.appendChild( this.options.uiElements.buttonGoMaxX );
			}
			this.elements.buttonGoMaxX.addEventListener( 'click', () => {
				this.setX( Date.now(), { render: true, xOriginRatio: .75 } );
			} );
		}
	}

}

