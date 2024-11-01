
import merge from './utils/merge';
import type Chart from './Chart';
import { type AbstractTick, type CandleTick, createElement } from './index.ts';
import InputSelect from './UI/InputSelect.ts';

//______
export type PlayerOptions = {
	buttonReplay?: HTMLElement | null,
	actionsElement?: HTMLElement | null,
	frameDuration?: number,// ms
	xOriginRatio?: number,
	onTick?: ( time: number ) => void,
	onSessionStart?: () => void,
	onSessionEnd?: () => void,
	onTimeSelected?: ( time: number ) => void,
	onPlayPause?: ( playing: boolean ) => void,
}

export default class Player<Tick extends AbstractTick = CandleTick> {
	private options: Required<PlayerOptions> = {
		buttonReplay: null,
		actionsElement: null,
		frameDuration: 1000,
		xOriginRatio: .75,
		onTick: () => {},
		onSessionStart: () => {},
		onSessionEnd: () => {},
		onTimeSelected: () => {},
		onPlayPause: () => {},
	}
	
	private timeSelection = false;
	private replayMode = false;
	private time = new Date().getTime();
	private playing = false;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private elements: Record<string, HTMLElement> = {};
	private mouseTime = 0;
	private playingSpeeds = [1,2,3] as const;
	private playingSpeed: typeof this.playingSpeeds[number] = 1;
	private inputSpeed?: InputSelect;

	constructor ( private chart: Chart<Tick>, options: PlayerOptions = {} ){
		this.options = merge( this.options, options );
		
		this.createElements();

		//___ events
		this.chart.mouseEnterLeaveListeners.add( this.onMouseEnterLeave );
		this.chart.mouseMoveListeners.add( this.onMouseMove );
		this.chart.mouseDownUpListeners.add( this.onMouseUpDown );
		document.addEventListener( 'keydown', this.onKeyDown );
	}

	setReplayMode ( mode: boolean | 'toggle' ): this {
		this.replayMode = mode === 'toggle' ? !this.replayMode : mode;
		if ( this.replayMode ){
			this.startSession();
		} else {
			this.endSession();
		}
		return this;
	}
	
	startSession(): this {
		this.enableTimeStartSelection( true );
		this.elements.actions.style.visibility = 'visible';
		return this;
	}
	
	endSession(): this {
		this.enableTimeStartSelection( false );
		this.elements.actions.style.visibility = 'hidden';
		this.chart.setMaxDisplayX( null, true );
		return this;
	}

	enableTimeStartSelection( value: boolean ): this {
		this.timeSelection = value;
		const mouseArea = this.chart.getElement( 'mouseArea' );
		this.setPlay( false );
		if ( this.timeSelection ){
			this.chart.setEnabledCrossHair( false );
			this.elements.actions.style.opacity = '.5';
			this.elements.actions.style.pointerEvents = 'none';
			mouseArea.style.zIndex = '500';
		} else {
			this.setPlay( false );
			this.chart.setEnabledCrossHair( true );
			this.elements.timeSelect.style.display = 'none';
			this.elements.actions.style.opacity = '1';
			this.elements.actions.style.pointerEvents = 'auto';
			if( this.zIndexOrigin){
				mouseArea.style.zIndex = this.zIndexOrigin;
			}
		}
		return this;
	}

	goTo( time: number ): this {
		this.time = Math.min( this.round( time ), this.chart.getTickIndexMax() );
		// console.log('goto', time, new Date( time ).toUTCString(), this.options.xOriginRatio );
		this.chart.setMaxDisplayX( this.time );
		this.chart.setX( this.time, { render: true, xOriginRatio: this.options.xOriginRatio } );
		return this;
	}
	
	setPlayingSpeed( value: typeof this.playingSpeed ){
		this.playingSpeed = value;
	}

	setPlay( play: boolean | 'toggle', time?: number ): this {
		const _play = play === 'toggle' ? !this.playing : play;
		if( _play === this.playing ){ return this;}
		this.playing = _play;
		this.elements.iconPlay.className = `icon ic-${this.playing?'stop':'play'}`;
		clearTimeout( this.timer );
		if( time ){
			this.goTo( time );
		}
		if( this.playing ){
			this.nextTick();
		}
		this.options.onPlayPause( this.playing );
		return this;
	}
	
	current = () => {
		return this.time;
	}

	nextTick = (): this => {
		clearTimeout( this.timer );
		this.time += this.chart.tickStep;
		const tickIndexMax = this.chart.getTickIndexMax();
		if ( this.time >= tickIndexMax ){
			this.time = tickIndexMax;
			this.setPlay( false );
		}else if ( this.playing ){
			this.timer = setTimeout( this.nextTick, this.options.frameDuration / this.playingSpeed );
		}
		this.chart.setMaxDisplayX( this.time );
		this.chart.translateX( this.chart.tickStep, { render: true } );
		// console.log('tick', new Date( this.time ).toUTCString() );
		this.options.onTick( this.time );
		return this;
	}

	beforeDestroy(): void {
		clearTimeout( this.timer );
		this.elements.btReplay.removeEventListener( 'click', this.onClickReplay );
		this.elements.btPlay.removeEventListener( 'click', this.onClickPlayStop );
		this.elements.btSkip.removeEventListener( 'click', this.onClickSkip );
		this.elements.btClose.removeEventListener( 'click', this.onClickClose );
	}

	//__ event handlers
	private onClickReplay = () => {
		this.setReplayMode('toggle');
	}

	private onClickTime = () => {
		this.chart.setMaxDisplayX( null, true );
		this.enableTimeStartSelection( true );
	}

	private onClickPlayStop = () => {
		this.setPlay('toggle');
	}

	private onClickSkip = () => {
		this.nextTick();
	}

	private onClickClose = () => {
		this.setReplayMode( false );
	}

	private onKeyDown = ( event: KeyboardEvent ) => {
		switch ( event.keyCode ){
			case 27:{//_ escape
				if( this.timeSelection ){
					this.enableTimeStartSelection( false );
				}
				break;
			}
			default:
				break;
		}
	}
	
	private onMouseEnterLeave = ( inside: boolean/*, event: MouseEvent*/ ) => {
		if( this.timeSelection ){
			this.elements.timeSelect.style.display = inside ? 'block' : 'none';
		}
	}

	private onMouseMove = ( x: number, y: number, time: number/*, event: MouseEvent*/ ) => {
		if( this.timeSelection ){
			this.mouseTime = time;
			this.elements.timeSelectMask.style.left = `${x}px`;
		}
	}

	private onMouseUpDown = ( isDown: boolean, /*event: MouseEvent*/ ) => {
		if ( !isDown && this.timeSelection ){
			this.enableTimeStartSelection( false );
			this.time = this.mouseTime;
			this.chart.setMaxDisplayX( this.time, true );
			// this.goTo( this.mouseTime );
		}
	}

	//__
	private round( value: number ){
		return Math.round( value / this.chart.tickStep ) * this.chart.tickStep;
	}
	
	private zIndexOrigin?: string;
	private createElements(){

		const parent = this.chart.getElement( 'candles' );
		
		if( this.options.buttonReplay ){
			this.elements.btReplay = this.options.buttonReplay;
		}else{
			this.elements.btReplay = createElement( 'button', {
				relativeElement: this.chart.getElement( 'toolbarTop' ),
				style: { padding: '4px' },
				attr: { title: 'Replay' },
				icon: { className: 'replay' },
				events: { click: this.onClickReplay }
			} );
		}

		if( this.options.actionsElement ){
			this.elements.actions = this.options.actionsElement;
		}else{
			this.elements.actions = createElement( 'div', {
				relativeElement: parent,
				className: 'toolbar player-actions',
				style: {
					position: 'absolute', zIndex: '200', visibility: 'hidden',
				}
			} );

			this.inputSpeed = new InputSelect('speed', {
				choices: this.playingSpeeds.map( s => ({ label: `x${s}`, value: s })),
				onChange: ( v ) => {
					this.setPlayingSpeed( v );
				}
			});
			this.elements.actions.append( this.inputSpeed.getMainElement() );
			
			this.elements.btPickTime = createElement( 'button', {
				relativeElement: this.elements.actions,
				style: { padding: '4px' },
				attr: { title: 'Select time' },
				icon: { className: 'capacitor' },
				events: { click: this.onClickTime }
			} );

			this.elements.btPlay = createElement( 'button', {
				relativeElement: this.elements.actions,
				style: { padding: '4px' },
				attr: { title: 'Play / Pause' },
				icon: { className: 'play' },
				events: { click: this.onClickPlayStop }
			} );

			this.elements.iconPlay = this.elements.btPlay.querySelector('.icon') as HTMLElement;

			this.elements.btSkip = createElement( 'button', {
				relativeElement: this.elements.actions,
				style: { padding: '4px' },
				attr: { title: 'Next tick' },
				icon: { className: 'step' },
				events: { click: this.onClickSkip }
			} );

			this.elements.btClose = createElement( 'button', {
				relativeElement: this.elements.actions,
				style: { padding: '4px' },
				attr: { title: 'Close replay' },
				icon: { className: 'close' },
				events: { click: this.onClickClose }
			} );
		}

		Object.assign( this.elements.actions.style, {
			bottom: '1px',
			left: `${ ( parent.clientWidth - this.elements.actions.clientWidth ) / 2 }px`,
		} );

		//__
		const mouseArea = this.chart.getElement('mouseArea');
		this.zIndexOrigin = mouseArea.style.zIndex;
		this.elements.timeSelect = createElement( 'div', {
			relativeElement: mouseArea,
			className: 'time-select',
			style: {
				position: 'absolute',
				inset: '0',
				pointerEvents: 'none',
				display: 'none',
				zIndex: '500',
			}
		} );

		this.elements.timeSelectMask = createElement( 'div', {
			relativeElement: this.elements.timeSelect,
			className: 'time-select-mask',
			style: {
				position: 'absolute',
				inset: '0',
				borderLeft: '1px solid #ffff00',
				backgroundColor: `#161616ee`,
			}
		} );

		// __ mark
		// this.elements.markCenterX = document.createElement( 'div' );
		// this.elements.markCenterX.className = 'mark-center-x';
		// const scaling = this.chart.scalingX;
		// const x = scaling.scaleTo( scaling.scaleIn.min + this.chart.tickStep/2 + scaling.distIn * this.options.xOriginRatio )
		// Object.assign( this.elements.markCenterX.style, {
		// 	zIndex: 99,
		// 	position: 'absolute',
		// 	inset: `0 0 0 ${x}px`,
		// 	borderLeft: '1px solid #0000ff',
		// 	pointerEvents: 'none',
		// } );
		// this.chart.getElement( 'candles' ).append( this.elements.markCenterX );

	}
}
