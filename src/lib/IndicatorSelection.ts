
import { Dialog/*, inputs, InputBase, type InputOptions*/ } from './UI';
import { list as indicators } from '@/lib/Indicator';

import { createElement } from './index.ts';

export type Options<I extends Indicator = Indicator> = {
	parentElement: HTMLElement,
	indicators: { [ key: string ]: I },
	onUpdate?: ( indicator: I ) => void,
}

type Indicator = { getLabel: () => string, new(): any }

//______
export default class IndicatorSelection<I extends Indicator = Indicator> {

	private options: Required<Options<I>> = {
		parentElement: document.body,
		// @ts-ignore
		indicators,
		onUpdate: () => {},
	}

	private dialog: Dialog;
	private elSelect: HTMLElement | null | undefined;
	private selIndicatorKey: keyof typeof this.options.indicators | null | undefined;
	private items = new Map<keyof typeof this.options.indicators,HTMLElement>();
	// private indicator: Indicator | null = null;
	// private elContent: HTMLElement | null = null;
	// private inputsChanges: { [ key: string ]: any } = {};
	// private inputs: InputBase[] = [];s
	
	constructor( options: Partial<Options<I>> = {} ){

		Object.assign( this.options, options );

		const content = createElement( 'div', {
			className: 'col',
			style: {
				flex: '1 1',
				overflowY: 'auto',
				gap: '1rem',
			},
		} );
		
		// const inputSearch = new inputs.text('search', {
		// 	relativeElement: content,
		// 	inputAttr: {
		// 		placeholder: 'Search'
		// 	},
		// });
		
		const list = createElement('div', {
			relativeElement: content,
			className: 'list-indicators',
			style: {
				flex: '1 1',
				overflowY: 'auto',
			}
		});
		
		const orderedKeys = Object.keys( this.options.indicators ).sort( ( a, b ) => {
			const aLabel = this.options.indicators[a].getLabel();
			const bLabel = this.options.indicators[b].getLabel();
			if( aLabel > bLabel ){  return 1;}
			else if( aLabel < bLabel ){  return -1;}
			return 0;
		});
		
		orderedKeys.forEach( key => {
			const el = createElement( 'div', {
				relativeElement: list,
				className: `item indicator-${ key }`,
				innerText: this.options.indicators[ key ].getLabel(),
				events: {
					click: () => {
						this.setSelection( key );
					}
				},
				// icon: { className: 'play' }
			} );
			this.items.set( key, el );
		});

		this.dialog = new Dialog( {
			title: 'Add an indicator',
			parentElement: this.options.parentElement,
			buttons: {
				ok: () => {
					if( this.selIndicatorKey ){
						this.options.onUpdate( this.options.indicators[this.selIndicatorKey] );
					}
				},
			},
			content,
		} );
	}
	
	setSelection( key: typeof this.selIndicatorKey ){
		let _key = key;
		if( this.elSelect ){		this.elSelect.classList.remove('select');}
		const prev = this.selIndicatorKey;
		this.elSelect = null;
		this.selIndicatorKey = null;
		if ( prev === _key ){		_key = null;}
		if( !_key ){ return;}
		this.selIndicatorKey = _key;
		this.elSelect = this.items.get( _key );
		this.elSelect?.classList.add( 'select' );
	}

	diplay ( display = true ){
		this.reset();
		this.dialog.display( display, {
		} );
	}
	
	reset(){
		this.setSelection( null );
	}
	
	remove(){
		this.dialog.remove();
	}
}

