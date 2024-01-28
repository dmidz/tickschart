
import merge from '@/utils/merge';
import type { Chart } from './Chart';

//______
export type PlayerOptions = {
	frameDuration?: number,// ms
	// tickLength?: number,// ms
	xOriginRatio?: number,
	onTick?: ( time: number ) => void,
	onSessionStart?: () => void,
	onSessionEnd?: () => void,
	onTimeSelected?: ( time: number ) => void,
	onPlayPause?: ( playing: boolean ) => void,
}

export class Player {
	private chart: Chart;
	private elToolbar: HTMLElement;
	private options: Required<PlayerOptions> = {
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
	private time = new Date().getTime();
	private playing = false;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private elements: Record<string, HTMLElement> = {};
	private moved = false;
	private mouseTime = 0;

	constructor ( chart: Chart, elToolbar: HTMLElement, options: PlayerOptions = {} ){
		this.chart = chart;
		this.elToolbar = elToolbar;
		this.options = merge( this.options, options );

		const areaElement = this.chart.getMouseMoveElement();
		//__ dom elements
		this.elToolbar.style.display = 'block';
		this.elToolbar.style.visibility = 'hidden';
		this.chart.getElement('main').append( this.elToolbar );
		Object.assign( this.elToolbar.style, {
			position: 'absolute',
			top: `${ Math.round(this.chart.getElement( 'candles' ).clientHeight - this.elToolbar.clientHeight-2) }px`,
			left: `${( areaElement.clientWidth - this.elToolbar.clientWidth)/2}px`,
			borderRadius: '8px 8px 0 0',
			borderBottom: 'none',
			zIndex: 300,
			display: 'none',
			visibility: 'visible',
		});

		this.elements.timeSelect = document.createElement( 'div' );
		this.elements.timeSelect.className = 'time-select';
		Object.assign( this.elements.timeSelect.style, {
			position: 'absolute',
			inset: 0,
			pointerEvents: 'none',
			display: 'none'
		} );
		areaElement.append( this.elements.timeSelect );

		this.elements.timeSelectMask = document.createElement( 'div' );
		this.elements.timeSelectMask.className = 'time-select-mask';
		Object.assign( this.elements.timeSelectMask.style, {
			position: 'absolute',
			inset: '0',
			borderLeft: '1px solid #ffff00',
			backgroundColor: `#161616ee`,
			pointerEvents: 'none',
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

		//___
		this.chart.addMouseEnterLeaveListener( this.onMouseEnterLeave );
		this.chart.addMouseMoveListener( this.onMouseMove );

		const mouseElement = this.chart.getMouseMoveElement();
		mouseElement.addEventListener( 'mousedown', this.onMouseDown );
		mouseElement.addEventListener( 'mouseup', this.onMouseUp );

	}
	
	startSession(): this {
		this.enableTimeStartSelection( true );
		this.elToolbar.style.display = 'block';
		return this;
	}
	
	endSession(): this {
		this.enableTimeStartSelection( false );
		this.elToolbar.style.display = 'none';
		this.chart.setMaxDisplayX( null, true );
		return this;
	}

	enableTimeStartSelection( value: boolean ): this {
		this.timeSelection = value;
		if ( this.timeSelection ){
			this.chart.setEnabledCrossHair( false );
			this.elToolbar.style.opacity = '.5';
			this.elToolbar.style.pointerEvents = 'none';
		} else {
			this.setPlay( false );
			this.chart.setEnabledCrossHair( true );
			this.elements.timeSelect.style.display = 'none';
			this.elToolbar.style.opacity = '1';
			this.elToolbar.style.pointerEvents = 'auto';
		}
		return this;
	}

	goTo( time: number ): this {
		/* TODO: stop when time >= now */
		this.time = this.round( time );
		// console.log('goto', time, new Date( time ).toUTCString(), this.options.xOriginRatio );
		this.chart.setMaxDisplayX( this.time );
		this.chart.setX( this.time, { render: true, xOriginRatio: this.options.xOriginRatio } );
		return this;
	}

	setPlay( play: boolean | 'toggle', time?: number ): this {
		const _play = play === 'toggle' ? !this.playing : play;
		if( _play === this.playing ){ return this;}
		this.playing = _play;
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
	
	beforeDestroy(): void {
		clearTimeout( this.timer );
		this.chart.removeMouseEnterLeaveListener( this.onMouseEnterLeave );
		this.chart.removeMouseMoveListener( this.onMouseMove );
		const mouseElement = this.chart.getMouseMoveElement();
		mouseElement.removeEventListener( 'mousedown', this.onMouseDown );
		mouseElement.removeEventListener( 'mouseup', this.onMouseUp );
	}

	private onMouseEnterLeave = ( inside: boolean, event: MouseEvent ) => {
		if( this.timeSelection ){
			// console.log('mouseEnterLeave', inside );
			this.elements.timeSelect.style.display = inside ? 'block' : 'none';
		}
	}

	private onMouseDown = ( event: MouseEvent ) => {
		this.moved = false;
	}

	private onMouseMove = ( x: number, y: number, time: number, event: MouseEvent ) => {
		if( this.timeSelection ){
			// console.log( 'mouseMove', { x, y }, new Date( time ).toUTCString() );
			this.mouseTime = time;
			this.moved = true;
			this.elements.timeSelectMask.style.left = `${x}px`;
		}
	}

	private onMouseUp = ( event: MouseEvent ) => {
		if ( this.timeSelection && !this.moved ){
			this.enableTimeStartSelection( false );
			this.time = this.mouseTime;
			this.chart.setMaxDisplayX( this.time, true );
			// this.goTo( this.mouseTime );
		}
	}

	nextTick = (): this => {
		clearTimeout( this.timer );
		if( this.playing ){
			this.timer = setTimeout( this.nextTick, this.options.frameDuration );
		}
		this.time += this.chart.tickStep;
		this.chart.setMaxDisplayX( this.time );
		this.chart.translateX( this.chart.tickStep, { render: true } );
		// console.log('tick', new Date( this.time ).toUTCString() );
		this.options.onTick( this.time );
		return this;
	}
	
	private round( value: number ){
		return Math.round( value / this.chart.tickStep ) * this.chart.tickStep;
	}

}
