
import merge from './utils/merge.ts';
import type { Base } from './Indicator/index.ts';
import { createElement } from './index';
import { Popover } from './UI/index';

//______
export type Options<I extends Base = Base> = {
	onClickSettings: ( indicator: I ) => void,
	onClickRemove: ( indicator: I ) => void,
}

export default class IndicatorHeader<Indicator extends Base = Base> {
	
	options: Options<Indicator> = {
		onClickSettings(){},
		onClickRemove(){},
	};
	
	private elRoot!: HTMLElement;
	private popMenu!: Popover;
	private btSettings!: HTMLElement;
	private btMenu!: HTMLElement;
	private btRemove!: HTMLElement;
	
	constructor ( private parentElement: HTMLElement, private chartElement: HTMLElement, 
				readonly indicator: Indicator, options: Partial<Options<Indicator>> ){

		this.options = merge( this.options, options );

		this.createElements();
	}
	
	private createElements(){
		this.elRoot = createElement( 'div', {
			relativeElement: this.parentElement,
			innerText: this.indicator.getLabel(),
			className: 'idctr-header',
			// style: {
			// 	position: 'absolute', left: '4px', top: '0', zIndex: '150',
			// }
		} );
		
		if( this.indicator.hasAnySetting() ){
			this.btSettings = createElement( 'button', {
				relativeElement: this.elRoot,
				className: 'btn small no-bdr',
				icon: {
					className: 'settings'
				},
				events: {
					click: this.onClickSettings as EventListenerOrEventListenerObject
				},
			} );
		}

		//__ menu
		const elMenu = createElement( 'div', {
			className: 'col list list-v',
			style: {
				padding: '5px',
			},
		} );
		this.btRemove = createElement('div',{
			relativeElement: elMenu,
			innerText: 'Remove',
			className: 'row list-item menu-item',
			icon: {
				className: 'trash',
			},
			events: {
				click: this.onClickRemove as EventListenerOrEventListenerObject
			},
			style: {
				alignItems: 'center',
				gap: '4px',
			},
		});

		this.popMenu = new Popover( {
			parentElement: this.chartElement,
			contentElement: elMenu,
		} );

		this.btMenu = createElement( 'button', {
			relativeElement: this.elRoot,
			className: 'btn small no-bdr',
			icon: {
				className: 'ellipsis'
			},
			events: {
				click: this.onClickOpenMenu as EventListenerOrEventListenerObject
			},
		} );
		
		//__
		return this;
	}

	private onClickSettings = ( event: MouseEvent ) => {
		this.options.onClickSettings( this.indicator );
	}

	private onClickOpenMenu = ( event: MouseEvent ) => {
		event.stopImmediatePropagation();
		this.popMenu.display( 'toggle', {
			relativeElement: this.btMenu,
		} );
	}

	private onClickRemove = ( event: MouseEvent ) => {
		this.options.onClickRemove( this.indicator );
		this.popMenu.display( false );
	}
	
	remove(){
		this.beforeDestroy();
		this.elRoot.remove();
	}

	beforeDestroy (){
		if( this.btSettings ){
			this.btSettings.removeEventListener( 'click', this.onClickSettings );
		}
		this.btMenu.removeEventListener( 'click', this.onClickOpenMenu );
		this.btRemove.removeEventListener( 'click', this.onClickRemove );
	}

	//___ static
	static instances: IndicatorHeader[] = [];

	static add ( instance: IndicatorHeader ){
		this.instances.push( instance );
	}

	static beforeDestroy (){
		this.instances.forEach( el => {
			el.beforeDestroy();
		} );
		this.instances = [];
	}
}
