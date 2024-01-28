
import merge from '@/utils/merge';
import { ScalingLinear, type Scale, type ScalingLinearOptions } from '@/utils/math';
import UiScale, { type Options as UiScaleOptions } from './UiScale';
import { addListenerFactory, removeListenerFactory, createElement, resizeCanvas, sharpCanvasValue, defaultTick,
	type CandleTick, type GetTick, type ElementRect } from './_shared';
import indicators, { type List, type IOptions } from './Indicator/index';
import ChartRow from './ChartRow';

//______
export type Options = {
	tickWidth?: number,
	canvas?: {
		imageSmoothingEnabled: boolean,
		lineWidth: number,
		// strokeStyle: string,
	},
	candle?: {
		color: {
			up: string,
			down: string,
		}
	},
	onScalingXChange?: ( scalingX: ScalingLinear ) => OrPromise<any>,
	scaleY?: ScalingLinearOptions,
	scaleX?: ScalingLinearOptions,
	uiScaleY?: UiScaleOptions,
	uiScaleX?: UiScaleOptions,
	crossHairLabelX?: ( value: number ) => string;
	crossHairLabelY?: null | ( ( value: number ) => string );
	keyboard?: {
		vx: number,
	},
	autoScaleY?: boolean,
	autoScaleYMargin?: number,
	yScaleWidth?: number,
}

export default class Chart {
	
	private elements: Record<string,HTMLElement> = {};
	private canvas: HTMLCanvasElement;
	width: number = 100;
	height: number = 100;
	scalingX: ScalingLinear;
	scalingY: ScalingLinear;
	options: Required<Options> = {
		tickWidth: 5,
		canvas: {
			imageSmoothingEnabled: false,
			lineWidth: 1,
			// strokeStyle: '#ff0000',
		},
		candle: {
			color: {
				up: '#ffffff',//'#00ff00',
				down: '#409eff',//'#ff0000',
			},
		},
		onScalingXChange: () => {},
		scaleY: {
		},
		scaleX: {
		},
		uiScaleY: {
		},
		uiScaleX: {
		},
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
	};

	private ctxTicks: CanvasRenderingContext2D;
	private uiScaleX: UiScale;
	private uiScaleY: UiScale;

	private tickWidth = 3;
	private tickWidthHalf = 2.5;
	private xMin = 0;
	private xMax = 100;
	private drag = false;
	private cx = 1;
	private cy = 1;
	private infosLabels: { [p in keyof CandleTick]?: string } = { open: 'O', high: 'H', low: 'L', close: 'C', vol: 'Vol' };


	private mouseOverChart = false;
	private resizing = false;
	private enabledCrossHair = true;
	private border = '1px solid #333333';
	private maxDisplayX: number | null = null;

	private chartRows: Map<string|number, ChartRow> = new Map();
	private mouseEnterElement: ElementRect;
	private mouseMoveElement: HTMLElement;
	private mouseIndicator: ChartRow | null = null;
	private mouseDragIndicator: ChartRow | null = null;

	constructor ( private parentElement: HTMLElement,
								public tickStep: number,
								private getTick: GetTick,
								options: Options = {} ){

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
				this.setScaleX( scaling.scaleIn );
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
		document.addEventListener( 'mouseup', this.onMouseUp );
		document.addEventListener( 'mousemove', this.onMouseMove );
		window.addEventListener('resize', this.onResize );

		this.resizeCanvas();
		//__
		return this;
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
	
	addIndicator<K extends keyof List>( type: K, key: string, options?: IOptions<K> ){
		// const { key } = indicator;
		if( this.chartRows.has( key )){
			console.warn(`An indicator is already registered with this key, it will be replaced: ${key}`);
		}

		const indicator = new indicators[type]( key, options );
		const row = new ChartRow( indicator, this.getTick, this.elements.main,
( scaling, row ) => {
					this.render( undefined, undefined, row );
				}, 
			{
				// height: 240,
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
		indicator.setTickStep( this.tickStep );
		this.chartRows.set( key, row );

		this.resizeCanvas();
		
		return this;
	}
	
	private mouseMoveListeners: ( ( x:number, y: number, xOut: number, event: MouseEvent ) => void )[] = [];
	addMouseMoveListener = addListenerFactory( this.mouseMoveListeners );
	removeMouseMoveListener = removeListenerFactory( this.mouseMoveListeners );

	private mouseEnterLeaveListeners: ( ( inside: boolean, event: MouseEvent ) => void )[] = [];
	addMouseEnterLeaveListener = addListenerFactory( this.mouseEnterLeaveListeners );
	removeMouseEnterLeaveListener = removeListenerFactory( this.mouseEnterLeaveListeners );

	private onMouseEnterChart = ( event: MouseEvent ) => {
		event.stopImmediatePropagation();
		this.mouseOverChart = true;
		if( this.enabledCrossHair ){
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
		if( event.button === 0 ){
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

	private _moveEvent: MouseEvent | null = null;
	private position: { x: number, y: number } = { x: 0, y: 0};
	private onMouseMove = ( event: MouseEvent ) => {
		// if( !this._moveEvent ){
			this._moveEvent = event;
			requestAnimationFrame( this.update );
		// }
	}
	private onKeyDown = ( event: KeyboardEvent ) => {
		// console.log('onKeyDown', event.keyCode, event );
		let v = this.options.keyboard.vx;
		if( event.shiftKey ){
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
		}

		if( this._moveEvent ){
			const event = this._moveEvent;
			this._moveEvent = null;

			if ( this.mouseOverChart ){
				//__ x
				const x = this.scalingX.scaleToInv( event.offsetX - this.tickWidthHalf );
				const tick = this.getTick( x );
				if ( !this.maxDisplayX || x < this.maxDisplayX ){
					Object.keys( this.infosLabels ).forEach( key => {
						const kv = `info-${ key }-value`;
						this.elements[ kv ].innerText = `${ +tick[ key as keyof CandleTick ] }`;
					} );
					this.elements.infos.style.display = 'flex';
				}else{
					this.elements.infos.style.display = 'none';
				}
				const xValue = Math.floor( this.scalingX.scaleTo( x ) + this.tickWidthHalf );
				this.elements.crossX.style.transform = `translateX(${ xValue }px)`;
				this.elements.labelX.innerText = ( this.options.crossHairLabelX || this.uiScaleX.options.formatLabel )( x );
				const px = Math.round(
					Math.min( 
						Math.max( xValue - this.elements.labelX.clientWidth / 2, 0 )
						, this.width- this.elements.labelX.clientWidth ) );
				this.elements.labelX.style.transform = `translateX(${ px }px)`;
				
				//__ y
				const target = event.target as ElementRect;
				let yPos = event.offsetY;
				const hLabel = Math.ceil( this.elements.labelY.clientHeight );
				let yLabel = Math.ceil(
					Math.min(
						Math.max( yPos - hLabel / 2, 0 )
						, ( target.rect?.height || 0) - hLabel ) );
				let yValue = 0;

				if( this.mouseIndicator ){
					const d = Math.floor(( target.rect?.y || 0 ) - ( this.mouseEnterElement.rect?.y || 0 ));
					yPos += d;
					yLabel += d;
					yValue = this.mouseIndicator.scalingY.scaleToInv( event.offsetY );
				}else{
					yValue = this.scalingY.scaleToInv( yPos );
				}
				this.elements.crossY.style.transform = `translateY(${ yPos }px)`;
				this.elements.labelY.innerText = ( this.options.crossHairLabelY || this.uiScaleY.options.formatLabel )( yValue );
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
						if( this.mouseDragIndicator ){
							this.mouseDragIndicator.translateY( vy );
						}else{
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

		}
		
		if ( render ){
			this.render();
		}

	}
	
	private resizeCanvas(){

		const resized = resizeCanvas( this.canvas );

		if( resized ) {
			this.width = resized.width;
			this.height = resized.height;
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
	
	private createDomElements(){
		Object.assign( this.parentElement.style, {
			display: 'flex',
			'flex-direction': 'column',
			overflow: 'hidden',
		} );
		//____ main
		this.elements.main = createElement('div', this.parentElement, {
			className: 'main',
			style: {
				flex: '1 1',
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'stretch',
				overflow: 'hidden',
			}
		});
		//____ row Candles
		this.elements.rowCandles = createElement('div', this.elements.main, {
			className: 'row-candles',
			style: {
				flex: '1 1',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'stretch',
				overflow: 'hidden',
			}
		});
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
		//____ mouse area: main without yScale
		// this.elements.mouseArea = createElement( 'div', this.elements.main, {
		// 	className: 'mouse-move-area',
		// 	style: {
		// 		display: 'block', zIndex: '90', position: 'absolute', cursor: 'crosshair',
		// 		left: '0', top: '0', bottom: '0', right: this.elements.scaleY.style.width,
		// 	}
		// } );
		// this.elements.mouseArea.tabIndex = 0;
		//__ cross
		const crossBorder = '1px solid #ffffff33';
		this.elements.cross = createElement( 'div', this.elements.main, {
			className: 'cross',
			style: {
				display: 'none', position: 'absolute', inset: `0 ${this.elements.scaleY.style.width} 0 0`, zIndex: '95',
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
			display: 'none', background: '#262626', color: '#ffffff'/*, color: '#409eff'*/, padding: '0 8px', overflow: 'hidden', zIndex: '96',
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
				position: 'absolute', left: '0', top: '0', zIndex: '96',
				display: 'flex', flexDirection: 'row', gap: '8px', justifyContent: 'flex-start',
			}
		} );

		Object.entries( this.infosLabels ).forEach( ( [key,label] ) => {
			const k = `info-${ key }`;
			this.elements[k] = createElement( 'div', this.elements.infos, {
				className: k,
				style: {
					display: 'flex', flexDirection: 'row', gap: '4px', justifyContent: 'flex-start',
				}
			} );
			this.elements[ k ].innerText = `${label}:`;
			
			const kv = `${ k }-value`;
			this.elements[ kv ] = createElement( 'div', this.elements[k], {
				className: kv,
				style: {}
			} );
		});

	}

	beforeDestroy(){
		this.uiScaleX.beforeDestroy();
		this.uiScaleY.beforeDestroy();
		this.mouseEnterElement.removeEventListener( 'mouseenter', this.onMouseEnterChart );
		this.mouseEnterElement.removeEventListener( 'mouseleave', this.onMouseLeaveChart );
		this.mouseMoveElement.removeEventListener( 'mousedown', this.onMouseDown );
		this.mouseMoveElement.removeEventListener( 'keydown', this.onKeyDown );
		document.removeEventListener( 'mouseup', this.onMouseUp );
		document.removeEventListener( 'mousemove', this.onMouseMove );
		window.removeEventListener( 'resize', this.onResize );
		
		this.chartRows.forEach( row => {
			row.beforeDestroy();
		});
	}
	
	refresh(){
		this.updateX( true, true );
		this.chartRows.forEach( row => {
			row.reset();
		} );
	}

	//__ x
	setTickStep( tickStep: number, { render = true, xOriginRatio = 0 } ){
		this.tickStep = tickStep;
		this.scalingX.setOption( 'precisionIn', this.tickStep );
		this.chartRows.forEach( row => {
			row.getIndicator().setTickStep( this.tickStep );
		});
		this.setX( this.scalingX.scaleIn.min, { render, force: render, xOriginRatio } );
	}

	setMaxDisplayX( x: number | null, render = false ){
		this.maxDisplayX = x;
		if ( render ){
			this.render();
		}
		return this;
	}
	
	translateX( delta: number, options?: { render?: boolean, xOriginRatio?: number, force?: boolean } ){
		this.setX( this.scalingX.scaleIn.min + delta, options );
		return this;
	}

	setX( x: number, { render = true, xOriginRatio = 0, force = false } = {} ){
		const scale = { min: x, max: x+this.width/this.tickWidth*this.tickStep };
		const d = xOriginRatio * ( scale.max - scale.min );
		scale.min -= d;
		scale.max -= d;
		this.uiScaleX.setScaleIn( scale );

		// console.warn( 'setX', { x, scale, scalingX: this.scalingX, xOriginRatio, render, force }/*, new Error('zzz')*/ );

		this.updateX( render, force );

		return this;
	}

	autoScaleX( render = true ){
		this.tickWidth = this.options.tickWidth;
		this.tickWidthHalf = this.tickWidth / 2;
		this.setX( this.scalingX.scaleIn.min+this.scalingX.distIn*.5, { render, force: true, xOriginRatio:.5 } );
		return this;
	}

	setScaleX( scale: Scale, render = true, force = false ){

		if ( this.scalingX.setScaleIn( scale ) ){
			this.uiScaleX.setScaleIn( scale );
		}

		this.tickWidth = this.scalingX.scaleTo( this.scalingX.scaleIn.min + this.tickStep );
		this.tickWidthHalf = this.tickWidth / 2;
		this.updateX( render, force );
	}

	private updateX( render = true, force = false ){

		this.cx = this.scalingX.distIn / this.scalingX.distOut;

		let changed = false;
		const xMin = Math.floor( this.scalingX.scaleIn.min / this.tickStep ) * this.tickStep;
		const xMax = Math.ceil( this.scalingX.scaleIn.max / this.tickStep ) * this.tickStep;
		// console.log('updateX', { _xMin: this.xMin, xMin, _xMax: this.xMax, xMax})
		if ( xMin !== this.xMin || xMax !== this.xMax ){
			this.xMin = xMin;
			this.xMax = xMax;
			// console.log('NbTicks', Math.ceil((this.xMax-this.xMin)/this.tickStep));
			changed = true;
		}

		// console.log( 'updateX', this.xMin, this.options.crossHairLabelX( this.xMin ), scale, this.options.crossHairLabelX( scale.min ) );

		const after = () => {
			if ( changed || force ){
				this.autoScaleY( false );
				// console.log('### updateX', new Date( this.xMin).toUTCString(), new Date( this.xMax ).toUTCString() );
				this.chartRows.forEach( row => {
					row.setViewXMinMax( this.xMin, this.xMax );
					row.autoScaleY();
				} );
			}

			if ( render ){
				this.render();
			}
		}

		const p = this.options.onScalingXChange( this.scalingX );

		if ( ( p as Promise<void> ).then ){
			p.then( after );
		} else {
			after();
		}

		return this;
	}

	//__ y
	translateY( delta: number, options?: { render?: boolean, yOriginRatio?: number } ){
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
		let t = this.xMin;
		let tick: ReturnType<GetTick>;
		while( t <= this.xMax ){
			tick = this.getTick( t );
			if( tick !== defaultTick ){
				min = Math.min( min, +tick.low );
				max = Math.max( max, +tick.high );
			}
			t += this.tickStep;
		}
		if( max - min === 0 ){
			max += 10;
		}

		// console.log( '//_________ getMinMaxY', { min, max }, new Date( this.xMin ).toUTCString() );

		return { min, max };
	}

	setCanvasOptions( options: Options['canvas'] ){
		// console.log('setCanvasOptions', options );
		Object.assign( this.ctxTicks, options );
	}
	
	render( xMin: number = this.xMin, xMax: number = this.xMax, row?: ChartRow ){
		if( xMax < this.xMin || xMin > this.xMax ){ return;}
		const _xMin = Math.max( xMin, this.xMin );
		let _xMax = Math.min( xMax, this.xMax );
		
		const xPx = this.scalingX.scaleTo( _xMin );
		let wPx = ( _xMax-_xMin ) / this.scalingX.distIn * this.scalingX.distOut;

		// console.log( 'render', { xMin, _xMin, xMax, _xMax, xPx, wPx,
		// 	scaleXMin: this.scalingX.scaleIn.min, scaleXMax: this.scalingX.scaleIn.max, distIn: this.scalingX.distIn } );

		if ( this.maxDisplayX ){
			_xMax = this.maxDisplayX;
			wPx = this.width - xPx;
		}

		const rows: ( Chart|ChartRow)[] = [];

		if( row ){
			rows.push( row );
		}else{
			rows.push( this, ...this.chartRows.values() );
		}

		rows.forEach( (row ) => {
			row.clearRect( xPx, wPx );
		} );

		// console.log( '//_________ render', { _xMin: new Date( _xMin ).toUTCString(), xMin: new Date( xMin ).toUTCString(), thisxMin: new Date( this.xMin ).toUTCString() } );
		let tick: ReturnType<GetTick>;
		let xPos: number;
		let x = _xMin;
		while ( x <= _xMax ){
			tick = this.getTick( x );
			xPos = this.scalingX.scaleTo( tick.time );
			for ( let i = 0, max = rows.length; i < max; i++ ){
				rows[ i ].drawTick( tick, xPos, this.tickWidth, x );
			}
			x += this.tickStep;
		}
	}

	clearRect( x: number, w: number ){
		this.ctxTicks.clearRect( x, 0, w, this.canvas.height );
	}

	drawTick( tick: CandleTick, x: number, width: number, index: number, debug = false ){
		
		const ctx = this.ctxTicks;
		const isDown = +tick.close < +tick.open;
		const col = isDown ? this.options.candle.color.down : this.options.candle.color.up;
		
		//__ wick
		ctx.strokeStyle = col;
		ctx.beginPath();
		const xWick = sharpCanvasValue( x + this.tickWidthHalf, .5 );//__ canvas 1px line need .5 pos

		ctx.moveTo( xWick, this.scalingY.scaleTo( tick.high ) );
		ctx.lineTo( xWick, this.scalingY.scaleTo( tick.low ) );
		ctx.stroke();
		
		//__ body
		ctx.fillStyle = col;
		const yOpen = this.scalingY.scaleTo( tick.open );
		const yClose = this.scalingY.scaleTo( tick.close );
		const xBody = sharpCanvasValue( x );
		ctx.fillRect( xBody, isDown ? yOpen : yClose, width, Math.max( 1, Math.abs( yClose - yOpen ) ) );

		// debug && console.log( 'drawTick', { isDown, xWick, xBody }, tick );
	}
	
}

