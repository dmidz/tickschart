import InputBase, { type BaseOptions } from './InputBase.ts';

//_____
export type Options = BaseOptions & {
}

//______
export default class InputText extends InputBase<Options> {
	constructor( key: string, options: Options = {} ){

		super( key, options );
	}
	
	protected buildInput(){
		const input = document.createElement( 'input' );
		input.setAttribute('type', 'text');
		input.addEventListener('input', this.handleChange );
		return input;
	}

	beforeDestroy (){
		this.elInput.removeEventListener( 'input', this.handleChange );
	}
}

