
import { Dialog/*, inputs, InputBase, type InputOptions*/ } from './UI';
import { list as indicators, Indicator } from '@/lib/Indicator';

import { createElement } from './index.ts';

export type Options = {
	parentElement: HTMLElement,
	indicators: { [ key: string ]: Indicator },
	onUpdate?: ( indicator: Indicator ) => void,
}

//______
export default class IndicatorSelection {

	private options: Required<Options> = {
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
	
	constructor( options: Partial<Options> = {} ){

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
		
		const keys = Object.keys( this.options.indicators );
		
		const labels: {[key:string]: string} = {};
		keys.forEach( key => {
			labels[key] = this.options.indicators[key].getLabel();
		});
		
		const orderedKeys = keys.sort( ( a, b ) => {
			if( labels[a] > labels[b] ){  return 1;}
			else if( labels[ a ] < labels[ b ] ){  return -1;}
			return 0;
		});
		
		orderedKeys.forEach( key => {
			const el = createElement( 'div', {
				relativeElement: list,
				className: `item indicator-${ key }`,
				innerText: labels[key],
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
			title: 'Add indicator',
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
}

