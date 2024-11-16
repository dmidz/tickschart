import InputBase, { type BaseOptions } from './InputBase.ts';
import { createElement } from '@/lib';

//_____
export type Options = BaseOptions & {
}

//______
export default class InputColor extends InputBase<Options> {
	constructor( key: string, options: Options = {} ){

		super( key, options );
	}
	
	protected buildInput(){
		return createElement( 'input', {
			relativeElement: this.elRoot,
			attr: {
				type: 'color',
			},
			events: {
				change: this.handleChange,
			}
		} ) as HTMLInputElement;
	}

	beforeDestroy (){
		this.elInput.removeEventListener( 'input', this.handleChange );
	}
}

