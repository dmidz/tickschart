
import merge from './utils/merge';
import type Chart from './Chart';
import { type AbstractTick, type CandleTick } from './index.ts';

//______
export type PlayerOptions = {
	buttonReplay?: HTMLElement | null,
	actionsElement?: HTMLElement | null,
	frameDuration?: number,// ms
	// tickLength?: number,// ms
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
		// tickLength: 1000*60*60,
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
	private moved = false;
	private mouseTime = 0;

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
			this.timer = setTimeout( this.nextTick, this.options.frameDuration );
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
			this.timer = setTimeout( this.nextTick, this.options.frameDuration );
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
			this.moved = true;
			this.elements.timeSelectMask.style.left = `${x}px`;
		}
	}

	private onMouseUpDown = ( isDown: boolean, /*event: MouseEvent*/ ) => {
		if( isDown ){
			this.moved = false;
		}else{
			if ( this.timeSelection && !this.moved ){
				this.enableTimeStartSelection( false );
				this.time = this.mouseTime;
				this.chart.setMaxDisplayX( this.time, true );
				// this.goTo( this.mouseTime );
			}
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
			this.elements.btReplay = createButtonIcon( parent, 'replay', 'Replay', this.onClickReplay, {
				position: 'absolute', zIndex: '200', right: '1px', top: '1px',
			});
		}

		if( this.options.actionsElement ){
			this.elements.actions = this.options.actionsElement;
		}else{
			this.elements.actions = document.createElement( 'div' );
			this.elements.actions.className = 'player-actions';
			Object.assign( this.elements.actions.style, {
				flex: 'none', alignSelf: 'center', display: 'flex', flexDirection: 'row', gap: '4px',
				position: 'absolute', zIndex: 200, visibility: 'hidden',
			} );

			this.elements.btPickTime = createButtonIcon( this.elements.actions, 'capacitor', 'Select time', this.onClickTime );

			this.elements.btPlay = createButtonIcon( this.elements.actions, 'play', 'Play / Pause', this.onClickPlayStop);
			this.elements.iconPlay = this.elements.btPlay.querySelector('.icon') as HTMLElement;

			this.elements.btSkip = createButtonIcon( this.elements.actions, 'step', 'Next tick', this.onClickSkip );

			this.elements.btClose = createButtonIcon( this.elements.actions, 'close', 'Close replay', this.onClickClose );
		}

		parent.append( this.elements.actions );
		Object.assign( this.elements.actions.style, {
			bottom: '1px',
			left: `${ ( parent.clientWidth - this.elements.actions.clientWidth ) / 2 }px`,
		} );

		//__
		const mouseArea = this.chart.getElement('mouseArea');
		this.zIndexOrigin = mouseArea.style.zIndex;
		this.elements.timeSelect = document.createElement( 'div' );
		this.elements.timeSelect.className = 'time-select';
		Object.assign( this.elements.timeSelect.style, {
			position: 'absolute',
			inset: 0,
			pointerEvents: 'none',
			display: 'none',
			zIndex: 500,
		} );
		mouseArea.append( this.elements.timeSelect );

		this.elements.timeSelectMask = document.createElement( 'div' );
		this.elements.timeSelectMask.className = 'time-select-mask';
		Object.assign( this.elements.timeSelectMask.style, {
			position: 'absolute',
			inset: '0',
			borderLeft: '1px solid #ffff00',
			backgroundColor: `#161616ee`,
		} );
		this.elements.timeSelect.append( this.elements.timeSelectMask );

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

function createButtonIcon( parent: HTMLElement, iconClass: string, title: string, clickHandler: ( ev: MouseEvent ) => void, style?: Partial<CSSStyleDeclaration> ){
	const button = document.createElement( 'button' );
	button.style.padding = '4px';
	button.setAttribute( 'title', title );
	const icon = document.createElement( 'span' );
	icon.className = `icon ic-${ iconClass}`;
	button.append( icon );
	if( style ){
		Object.assign( button.style, style );
	}
	parent.append( button );
	button.addEventListener( 'click', clickHandler );
	return button;

}