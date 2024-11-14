import InputBase, { type BaseOptions } from './InputBase.ts';
import { createElement } from '@/lib';

//_____
export type Options = BaseOptions & Readonly<{
	choices: ReadonlyArray<SelectItem>,
}>

//______
export default class InputSelect extends InputBase<Options> {
	constructor( key: string, options: Options ){
		super( key, options );
	}

	protected buildInput (){
		const input = createElement( 'select', {
			events: {
				change: this.handleChange,
			},
		} ) as HTMLSelectElement;

		this.options.choices.forEach( choice => {
			const option = document.createElement( 'option' );
			option.innerText = choice.label;
			option.value = `${choice.value}`;
			input.append( option );
		});

		return input;
	}

	protected inputValue () {
		const index = ( this.elInput as HTMLSelectElement ).selectedIndex;
		if( index === -1 ){ return null;}
		return this.options.choices[index].value;
	}

	beforeDestroy (){
		this.elInput.removeEventListener( 'change', this.handleChange );
	}
}

