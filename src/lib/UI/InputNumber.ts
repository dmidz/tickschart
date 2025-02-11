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
		const res = createElement( 'input', {
			relativeElement: this.elRoot,
			attr: {
				type: 'number',
				min: `${this.options.min||''}`,
				max: `${ this.options.max || '' }`,
			},
			events: {
				change: this.handleChange,
			}
		} ) as HTMLInputElement;
		
		return res;
	}

	protected inputValue (){
		return +this.elInput.value;
	}

	protected checkValue ( value: any ){
		let res = +value;
		if ( isNaN( res ) ){
			res = 0;
		}

		if ( this.options.min ){
			res = Math.max( res, this.options.min );
		}
		if ( this.options.max ){
			res = Math.min( res, this.options.max );
		}
		return res;
	}

	beforeDestroy (){
		this.elInput.removeEventListener( 'change', this.handleChange );
	}
}

