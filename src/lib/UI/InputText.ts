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
			relativeElement: this.elRoot,
			attr: {
				type: 'text',
			},
			events: {
				change: this.handleChange,
			}
		} ) as HTMLInputElement;
	}

	beforeDestroy (){
		this.elInput.removeEventListener( 'change', this.handleChange );
	}
}

