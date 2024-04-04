import InputBase, { type BaseOptions } from './InputBase.ts';

//_____
export type Options = BaseOptions & {
	min: number,
	max: number
}

//______
export default class InputNumber extends InputBase<Options> {
	constructor( key: string, options: Options ){

		super( key, options );
	}
	
	protected buildInput(){
		const input = document.createElement( 'input' );
		input.setAttribute('type', 'text');
		input.addEventListener('input', this.handleChange );
		return input;
	}

	remove (){
		this.elInput.removeEventListener( 'input', this.handleChange );

		super.remove();
	}

}

