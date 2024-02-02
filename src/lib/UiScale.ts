
import merge from './utils/merge.ts';
import { decimal, roundPrecision, ScalingLinear, type Scale } from './utils/math.ts';

//__
export type Options = {
	minLabelDist?: number,
	stepsDecimal?: number[] | null,
	stepsRange?: number[] | null,
	stepIncreaseMult?: number,
	formatLabel?: ( v: number, precision?: number ) => string,
	onChange?: ( scaling: ScalingLinear, emitter: UiScale ) => void,
	onDoubleClick?: ( scaling: ScalingLinear, emitter: UiScale ) => void,
	debug?: boolean,
}

export default class UiScale {
	
	private dir: 'x' | 'y';
	private element: HTMLElement;
	private scaling: ScalingLinear;
	options: Required<Options> = {
		minLabelDist: 35,
		stepsDecimal: [ 1, 2, 2.5, 4, 5 ],//__ steps between 1 - 10, recursive on decimal range
		stepsRange: null,//__ or fixed steps range, over last, last one will incr last + last until valid ( ex: for timescale )
		stepIncreaseMult: .2,
		formatLabel: ( value: number, precision = this.scaling.getOption('precisionIn') ) => {
			return roundPrecision( value, precision )
		},
		onChange: () => {},
		onDoubleClick: () => {},
		debug: false,
	};
	
	private moveProp: 'movementX' | 'movementY';
	private sizeProp: 'clientWidth' | 'clientHeight';
	private posProp: 'translateX' | 'translateY';
	private step = 1;
	private firstValue = 1;
	private lastValue = 1;
	private isDirX = false;
	private drag = false;
	
	constructor ( parentElement: HTMLElement, dir: 'x' | 'y', scaling: ScalingLinear, options: Options = {} ){
		this.dir = dir;
		this.scaling = scaling;
		this.options = merge( this.options, options );

		if ( !this.options.stepsDecimal && !this.options.stepsRange ){
			throw new Error('Either options.stepsDecimal or options.stepsRange must be set.' );
		}

		this.isDirX = this.dir === 'x';
		
		if( this.isDirX ){
			this.moveProp = 'movementX';
			this.sizeProp = 'clientWidth';
			this.posProp = 'translateX';
		}else{
			this.moveProp = 'movementY';
			this.sizeProp = 'clientHeight';
			this.posProp = 'translateY';
		}
		
		parentElement.style.position = 'relative';
		this.element = document.createElement( 'div' );
		this.element.className = 'labels';
		parentElement.append( this.element );
		Object.assign( this.element.style, {
			position: 'absolute',
			inset: 0,
			overflow: 'hidden',
			cursor: this.isDirX ? 'ew-resize' : 'ns-resize',
			userSelect: 'none',
			lineHeight: '1em',
		});

		//__ events
		this.element.addEventListener( 'dblclick', this.onDoubleClick );
		this.element.addEventListener( 'mousedown', this.onMouseDown );
		document.addEventListener( 'mouseup', this.onMouseUp );
		document.addEventListener( 'mousemove', this.onMouseMove );
		this.element.addEventListener( 'keydown', this.onKeyDown );

		this.setScaleIn( this.scaling.scaleIn );

	}

	setScaleIn( scale: Scale, emit = false ){
		this.scaling.setScaleIn( scale );

		this.update();
		
		if( emit ){
			this.options.onChange( this.scaling, this );
		}
	}
	
	setScaleOut( scale: Scale, emit = false ){
		this.scaling.setScaleOut( scale );
		
		this.update();
		
		if( emit ){
			this.options.onChange( this.scaling, this );
		}
	}
	
	increaseScale( deltaRatio: number, emit = false ){
		if( !deltaRatio ){ return;}
		const delta = this.scaling.distIn * deltaRatio * this.options.stepIncreaseMult;
		this.setScaleIn( {
			min: this.scaling.scaleIn.min - delta,
			max: this.scaling.scaleIn.max + delta,
		}, emit );
	}
	
	beforeDestroy (){
		this.element.removeEventListener( 'dblclick', this.onDoubleClick );
		this.element.removeEventListener( 'mousedown', this.onMouseDown );
		document.removeEventListener( 'mouseup', this.onMouseUp );
		document.removeEventListener( 'mousemove', this.onMouseMove );
		this.element.removeEventListener( 'keydown', this.onKeyDown );
	}

	private update(){
		this.step = this.findStep( this.options.minLabelDist / this.scaling.distOut * this.scaling.distIn );
		this.firstValue = Math.ceil( this.scaling.scaleIn.max / this.step ) * this.step;
		this.lastValue = Math.floor( this.scaling.scaleIn.min / this.step ) * this.step;
		this.render();
	}

	private onDoubleClick = ( event: MouseEvent ) => {
		if ( event.button === 0 ){
			event.stopImmediatePropagation();//__ avoid any sub mousedown
			this.options.onDoubleClick( this.scaling, this );
		}
	}

	private onKeyDown = ( event: KeyboardEvent ) => {
		const v = .02;// TODO: add option keyboardArrowDeltaRatio
		if( this.isDirX ){
			switch ( event.keyCode ){
				default:
					break;
				case 37:{//_ left
					this.increaseScale( -v, true );
					break;
				}
				case 39:{//_ right
					this.increaseScale( v, true );
					break;
				}
			}
		}else{
			switch ( event.keyCode ){
				default:
					break;
				case 38:{//_ up
					this.increaseScale( -v, true );
					break;
				}
				case 40:{//_ down
					this.increaseScale( v, true );
					break;
				}
			}
		}
	}

	private onMouseDown = ( event: MouseEvent )=> {
		if ( event.button === 0 ){
			event.stopImmediatePropagation();//__ avoid any sub mousedown
			this.drag = true;
		}
	}

	private onMouseUp = ( event: MouseEvent )=> {
		this.drag = false;
	}

	private onMouseMove = ( event: MouseEvent )=> {
		// TODO: use requestAnimationFrame for best perf ( like in Chart mousemove )
		if( !this.drag ){ return;}
		this.increaseScale( event[this.moveProp]/100, true );
	}

	private render(){

		let value = this.firstValue;
		let pos: number = 0;
		let i = 0;
		
		while ( value >= this.lastValue ){
			let el = this.element.children[i++] as HTMLElement;
			
			if( !el ){
				el = document.createElement( 'div' );
				Object.assign( el.style, {
					position: 'absolute',
					// pointerEvents: 'none',
					[ this.isDirX ? 'top' : 'left' ]: '4px',
				} );
				this.element.tabIndex = 0;
				this.element.append( el );
			}

			Object.assign( el.style, {
				display: 'block',
			} );

			el.innerText = `${ this.options.formatLabel( value, Math.min( this.scaling.getOption('precisionIn'), this.step )) }`;

			pos = Math.round( -el[ this.sizeProp ] / 2 );

			el.style.transform = `${ this.posProp }(${ this.scaling.scaleTo( value ) + pos }px`;

			value -= this.step;
		}
		
		while( i < this.element.children.length ){
			const el = this.element.children[i++] as HTMLElement;
			el.style.display = 'none';
		}

	}
	
	private findStep( _dist: number ): number {
		const dist = Math.abs( _dist );
		let res: number = 100;
		
		if( this.options.stepsRange ){
			const k = dist;
			let p = this.options.stepsRange[0];
			const max = this.options.stepsRange.length;
			let i = 0;
			while( p < k ){
				if( i < max ){
					p = this.options.stepsRange[i++];
				}else{
					p += this.options.stepsRange[max-1];
				}
			}

			res = p;
		}else if( this.options.stepsDecimal ){
			
			const dec = decimal( dist );
			const k = dist / dec;
			let p = this.options.stepsDecimal[ 0 ];

			if ( k > p ){
				let mult = 1;
				let i = 1;
				let z;
				const max = this.options.stepsDecimal.length;
				while ( i < max ){
					z = this.options.stepsDecimal[ i ] * mult;
					if ( k <= z ){
						p = z;
						break;
					}
					if ( ++i >= max ){
						i = 0;
						mult *= 10;
					}
				}
			}

			res = p * dec;
		}

		return res;
	}
}
