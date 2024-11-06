
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
	private elSelect: HTMLElement | null = null;
	private selIndicator: I | null = null;
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
		
		let key: typeof orderedKeys[number];
		for( let i = 0, max = orderedKeys.length; i < max; i++ ){
			key = orderedKeys[i];
			const el = createElement('div', {
				relativeElement: list,
				className: `item indicator-${key}`,
				innerText: this.options.indicators[key].getLabel(),
				events: {
					click: () => {
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

