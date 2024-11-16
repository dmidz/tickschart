import { set } from 'lodash';
import { Dialog, inputs, InputBase, type InputOptions } from './UI/index.ts';
import { Base, SettingGroup } from '@/lib/Indicator';
import { createElement } from './index.ts';

export type Options = {
	parentElement?: HTMLElement,
	onUpdate?: ( indicator: Base, changes: {[key:string]: any} ) => void,
}

//______
export default class IndicatorSettings {

	private options: Required<Options> = {
		parentElement: document.body,
		onUpdate: () => {},
	}

	private dialog: Dialog;
	private indicator: Base | null = null;
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
						this.options.onUpdate( this.indicator, this.inputsChanges );
					}
				},
			},
		} );
	}

	display ( indicator: Base, display = true ){
		if ( indicator !== this.indicator ){
			this.indicator = indicator;
			this.inputs.forEach( input => {
				input.remove();
			});
			this.inputs = [];
			this.inputsChanges = {};
			//__ build settings inputs
			if ( indicator.hasAnySetting() ){
				this.elContent = createElement( 'div', {
					className: 'fields',
				} );
				indicator.userSettings.forEach( ( is/*, index*/ ) => {
					this.createSettingField( indicator, is, this.elContent as HTMLElement );
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
	
	private createSettingField( indicator: Base, setting: typeof indicator.userSettings[number], parentElement: HTMLElement ){
		if( setting instanceof SettingGroup ){
			const fieldset = createElement( 'fieldset', {
				relativeElement: parentElement,
				className: 'col',
				style: {
					gap: '8px',
					border: '1px solid #333333',
				}
			} );
			fieldset.appendChild( createElement( 'legend', {
				innerText: setting.label,
			} ) );

			setting.settings.forEach( ( is ) => {
				this.createSettingField( indicator, is, fieldset );
			} );
		} else {
			const cl = inputs[ setting.type ];
			const opts = {
				...setting.options,
				value: indicator.getOption( setting.key ),
				relativeElement: parentElement,
				onChange: ( value: any ) => {
					set( this.inputsChanges, setting.key, value );
				},
			} as Extract<InputOptions, { type: typeof setting.type }>;
			const input = new cl( setting.key, opts );
			this.inputs.push( input );
		}

	}
}

