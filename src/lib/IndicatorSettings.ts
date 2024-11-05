
import { Dialog, inputs, InputBase, type InputOptions } from './UI/index.ts';
import type { Setting, Base } from '@/lib/Indicator';
import { createElement } from './index.ts';

export type Options = {
	parentElement?: HTMLElement,
	onUpdate?: () => void,
}

//______
export default class IndicatorSettings<Indicator extends Base = Base> {

	private options: Required<Options> = {
		parentElement: document.body,
		onUpdate: () => {},
	}

	private dialog: Dialog;
	private indicator: Indicator | null = null;
	private elContent: HTMLElement | null = null;
	private inputsChanges: { [ key: string ]: any } = {};
	private inputs: InputBase[] = [];
	
	constructor( options: Options = {} ){
		Object.assign( this.options, options );
		this.dialog = new Dialog( {
			title: 'Indicator Settings',
			parentElement: this.options.parentElement,
			buttons: {
				ok: () => {
					if ( this.indicator ){
						this.indicator.setOptions( this.inputsChanges );
						this.options.onUpdate();
					}
				},
			},
		} );
	}

	diplay ( indicator: Indicator, display = true ){
		if ( indicator !== this.indicator ){
			this.indicator = indicator;
			this.inputs.forEach( input => {
				input.remove();
			});
			this.inputs = [];
			this.inputsChanges = {};
			//__ build settings inputs
			if ( indicator.settings ){
				this.elContent = createElement( 'div', {
					className: 'fields',
					style: {
						display: 'flex',
						flexDirection: 'column',
						gap: '8px',
					},
				} );
				Object.keys( indicator.settings ).forEach( key => {
					const is = indicator.settings[ key as keyof typeof indicator.settings ] as Setting;
					const cl = inputs[ is.type ];
					if ( cl ){
						const opts = {
							...is.options,
							value: indicator.getOption( key ),
							relativeElement: this.elContent,
							onChange: ( value: any/*, key, inputinput*/ ) => {
								this.inputsChanges[ key ] = value;
							},
						} as Extract<InputOptions, { type: typeof is.type }>;
						const input = new cl( key, opts );
						this.inputs.push( input );
					}
				} );
			} else {
				this.elContent = null;
			}
		}

		this.dialog.display( display, {
			title: `${ indicator.getLabel() }`,
			content: this.elContent,
		} );
	}
	
	remove(){
		this.dialog.remove();
	}
}

