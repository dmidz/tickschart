
import { Dialog/*, inputs, InputBase, type InputOptions*/ } from './UI';
import { list as indicators } from '@/lib/Indicator';

import { createElement } from './index.ts';

export type Options<I> = {
	parentElement: HTMLElement,
	indicators: { [ key: string ]: I },
	onUpdate?: ( indicator: I ) => void,
}

type Indicator = { getLabel: () => string, new(): any }

//______
export default class IndicatorSelection<K extends Indicator = Indicator> {

	private options: Required<Options<K>> = {
		parentElement: document.body,
		// @ts-ignore
		indicators: { k: indicators.MA },
		onUpdate: () => {
		},
	}

	private dialog: Dialog;
	private elSelect: HTMLElement | null = null;
	private selIndicator: K | null = null;
	// private indicator: Indicator | null = null;
	// private elContent: HTMLElement | null = null;
	// private inputsChanges: { [ key: string ]: any } = {};
	// private inputs: InputBase[] = [];s
	
	constructor( options: Partial<Options<Indicator>> = {} ){

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
		
		for(const key in this.options.indicators ){
			const el = createElement('div', {
				relativeElement: list,
				className: `item indicator-${key}`,
				innerText: this.options.indicators[key].getLabel(),
				events: {
					click: ( evt) => {
						if( this.elSelect ){
							this.elSelect.classList.remove('select');
						}
						if( el === this.elSelect ){
							this.elSelect = null;
							this.selIndicator = null;
							return;
						}
						this.elSelect = el;
						this.elSelect.classList.add( 'select' );
						this.selIndicator = this.options.indicators[key];
					}
				},
				// icon: { className: 'play' }
			});
		}

		this.dialog = new Dialog( {
			title: 'Add an indicator',
			parentElement: this.options.parentElement,
			buttons: {
				ok: () => {
					if( this.selIndicator ){
						this.options.onUpdate( this.selIndicator );
					}
				},
			},
			content,
		} );
	}

	diplay ( display = true ){
		this.dialog.display( display, {
		} );
	}
	
	remove(){
		this.dialog.remove();
	}
}

