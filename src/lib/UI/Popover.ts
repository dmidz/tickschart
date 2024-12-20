import { createElement } from '../index.ts';

//_____
export type Options = {
	parentElement: HTMLElement,
	contentElement?: HTMLElement,
	positionGap: number,
}

type AnchorPosition = 'C' | 'T' | 'TR' | 'R' | 'BR' | 'B' | 'BL' | 'L' | 'TL';

//______
export default class Popover {
	private options: Options = {
		parentElement: document.body,
		positionGap: 10,
	}
	
	private elWrapper!: HTMLElement;
	private elContent: HTMLElement | null = null;
	private isDisplayed = false;

	constructor( options: Partial<Options> = {} ){
		Object.assign( this.options, options );

		this.createElements();
		this.setContent( this.options.contentElement );

		Popover.add( this );
	}
	
	display( display: boolean | 'toggle' = 'toggle', options: {
				content?: HTMLElement,
				relativeElement?: HTMLElement, relativeAnchor?: AnchorPosition, popoverAnchor?: AnchorPosition } = {
	} ){
		const _display = display === 'toggle' ? !this.isDisplayed : display;
		if( _display === this.isDisplayed ){ return;}
		this.isDisplayed = _display;
		if( this.isDisplayed ){
			Popover.hideAll( this );
		}
		if( this.isDisplayed ){
			if( options.content ){
				this.setContent( options.content );
			}
			if( options.relativeElement ){
				this.position( options.relativeElement, options.relativeAnchor, options.popoverAnchor );
			}
		}
		
		this.elWrapper.style.display = this.isDisplayed ? 'flex' : 'none';
	}

	setContent ( content?: HTMLElement | null ){
		if ( content === this.elContent ){		return;}
		if ( this.elContent ){
			this.elContent.remove();
		}
		if ( content ){
			this.elContent = content;
			this.elWrapper.append( this.elContent );
		}
	}

	private position( relativeElement?: HTMLElement, relativeAnchor: AnchorPosition = 'TR', popoverAnchor: AnchorPosition = 'TL' ){
		if( !relativeElement ){  return;}
		const popRect = this.elWrapper.getBoundingClientRect();
		const relRect = relativeElement.getBoundingClientRect();
		let top = relRect.y;
		let left = relRect.x;
		switch ( relativeAnchor ){
			default:// tr
				left += relRect.width + this.options.positionGap;
				break;
		}
		switch ( popoverAnchor ){
			default:// tl'
				break;
		}

		this.elWrapper.style.top = `${top}px`;
		this.elWrapper.style.left = `${left}px`;
	}

	private createElements (){
		this.elWrapper = createElement( 'div', {
			relativeElement: this.options.parentElement,
			className: 'popover',
			style: {
				display: 'none',
				position: 'fixed',
				zIndex: '999',
			},
			events: {
				click: this.onClickIn as EventListenerOrEventListenerObject,
			},
		} );

	}

	private onClickIn = ( ev: MouseEvent ) => {
		ev.stopImmediatePropagation();
	}
	
	beforeDestroy (){
		this.elWrapper.removeEventListener( 'click', this.onClickIn );
		this.elWrapper?.remove();
	}

	//___ static
	static instances: Popover[] = [];
	
	static add( instance: Popover ){
		this.instances.push( instance );
	}
	
	static hideAll = ( butInstance?: Popover ) => {
		this.instances.forEach( inst => {
			if( ( !butInstance || butInstance !== inst ) ){
				inst.display( false );
			}
		} );
	}

	static beforeDestroy (){
		document.body.removeEventListener( 'click', Popover.onClickOut );
		this.instances.forEach( el => { el.beforeDestroy();} );
		this.instances = [];
	}

	private static onClickOut = () => {
		Popover.hideAll();
	}

	static {
		document.body.addEventListener( 'click', Popover.onClickOut );
	}

}