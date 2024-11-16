import InputBase, { type BaseOptions } from './InputBase.ts';
import { createElement } from '@/lib';

//_____
export type Options = BaseOptions & {
	min?: number,
	max?: number
}

//______
export default class InputNumber extends InputBase<Options> {
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
				input: this.handleChange,
			}
		} ) as HTMLInputElement;
	}

	beforeDestroy (){
		this.elInput.removeEventListener( 'input', this.handleChange );
	}
}

