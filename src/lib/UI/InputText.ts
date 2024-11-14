import InputBase, { type BaseOptions } from './InputBase.ts';
import { createElement } from '../index';

//_____
export type Options = BaseOptions & {
}

//______
export default class InputText extends InputBase<Options> {
	constructor( key: string, options: Options = {} ){

		super( key, options );
	}
	
	protected buildInput(){
		return createElement( 'input', {
			attr: {
				type: 'text',
			},
			events: {
				input: this.handleChange,
			}
		} ) as HTMLInputElement;
	}

	beforeDestroy (){
		this.elInput.removeEventListener( 'input', this.handleChange );
	}
}

