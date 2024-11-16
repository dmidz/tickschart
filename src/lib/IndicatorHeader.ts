
import merge from './utils/merge.ts';
import type { Base } from './Indicator/index.ts';
import { createElement } from './index';
import { Popover } from './UI/index';

//______
export type Options<I extends Base = Base> = {
	onOpenSettings: ( indicator: I ) => void,
	onRemove: ( indicator: I ) => void,
	onActivate: ( indicator: I, isActive: boolean ) => void,
}

export default class IndicatorHeader<Indicator extends Base = Base> {
	
	options: Options<Indicator> = {
		onOpenSettings(){},
		onRemove(){},
		onActivate(){},
	};
	
	private elRoot!: HTMLElement;
	private popMenu!: Popover;
	private btSettings!: HTMLElement;
	private btMenu!: HTMLElement;
	private btRemove!: HTMLElement;
	private userSettingsValue = new Map<string,HTMLElement>();
	private btActivate!: HTMLElement;

	constructor ( private parentElement: HTMLElement, private chartElement: HTMLElement, 
				readonly indicator: Indicator, options: Partial<Options<Indicator>> ){

		this.options = merge( this.options, options );

		this.createElements();
	}
	
	update(){
		this.userSettingsValue.forEach( ( uvs, key ) => {
			uvs.innerText = this.indicator.getOption( key );
		});
	}

	remove (){
		this.beforeDestroy();
		this.elRoot.remove();
	}

	beforeDestroy (){
		if ( this.btSettings ){
			this.btSettings.removeEventListener( 'click', this.onClickSettings );
		}
		this.btMenu.removeEventListener( 'click', this.onClickOpenMenu );
		this.btRemove.removeEventListener( 'click', this.onClickRemove );
	}

	private onClickSettings = ( event: MouseEvent ) => {
		this.options.onOpenSettings( this.indicator );
	}

	private onClickOpenMenu = ( event: MouseEvent ) => {
		event.stopImmediatePropagation();
		this.popMenu.display( 'toggle', {
			relativeElement: this.btMenu,
		} );
	}

	private onClickRemove = ( event: MouseEvent ) => {
		this.options.onRemove( this.indicator );
		this.popMenu.display( false );
	}

	private onClickActivate = ( event: MouseEvent ) => {
		this.indicator.setActive('toggle');
		const icon = this.btActivate.querySelector('.icon');
		if( icon ){
			if( this.indicator.isActive ){
				icon.classList.remove( 'ic-eye-crossed' );
			}else{
				icon.classList.add( 'ic-eye-crossed' );
			}
		}
		this.options.onActivate( this.indicator, this.indicator.isActive );
	}

	private createElements(){
		this.elRoot = createElement( 'div', {
			relativeElement: this.parentElement,
			innerText: this.indicator.label,
			className: 'idctr-header',
			// style: {
			// 	position: 'absolute', left: '4px', top: '0', zIndex: '150',
			// }
		} );

		if( this.indicator.hasAnySetting() ){
			this.indicator.userSettingsInHeader.forEach( optionKey => {
				// console.log('zzz', optionKey )
				this.userSettingsValue.set( optionKey, createElement( 'div', {
					relativeElement: this.elRoot,
					innerText: this.indicator.getOption( optionKey ),
					style: {
						color: '#999999',
					}
				} ) );
			} );
		}

		this.btActivate = createElement( 'button', {
			relativeElement: this.elRoot,
			className: 'btn small no-bdr',
			attr: {
				title: 'Toggle active'
			},
			icon: {
				className: 'eye'
			},
			events: {
				click: this.onClickActivate as EventListenerOrEventListenerObject
			},
		} );

		if ( this.indicator.hasAnySetting() ){
			this.btSettings = createElement( 'button', {
				relativeElement: this.elRoot,
				className: 'btn small no-bdr',
				attr: {
					title: 'Indicator settings...'
				},
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
