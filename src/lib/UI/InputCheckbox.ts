import InputBase, { type BaseOptions } from './InputBase.ts';
import { createElement } from '@/lib';

//_____
export type Options = BaseOptions & {
}

//______
export default class InputCheckbox extends InputBase<Options> {
	constructor( key: string, options: Options = {} ){

		super( key, options );
	}
	
	protected buildInput(){
		
		const wrapper = createElement( 'div', {
			relativeElement: this.elRoot,
			className: 'row',
			style: {
				alignSelf: 'stretch',
				alignItems: 'center',
			}
		} );
		
		return createElement( 'input', {
			relativeElement: wrapper,
			attr: {
				type: 'checkbox',
			},
			events: {
				change: this.handleChange,
			}
		} ) as HTMLInputElement;
	}
	
	getValue( ){
		return ( this.elInput as HTMLInputElement ).checked;
	}

	setValue( value:any){
		super.setValue( value );
		this.elInput.value = value;
		this.elInput.setAttribute('checked', value );
	}

	beforeDestroy (){
		this.elInput.removeEventListener( 'input', this.handleChange );
	}
}

