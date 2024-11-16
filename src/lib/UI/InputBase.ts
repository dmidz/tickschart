import { createElement } from '../index.ts';

//_____
export type BaseOptions = {
	relativeElement?: HTMLElement | null,
	relativePosition?: Required<Parameters<typeof createElement>>[1]['relativePosition'],
	label?: string | null,
	onChange?: ( value: any, key: string, emitter: InputBase ) => void,
	value?: any,
	inputAttr?: { [ key: string ]: string },
}

//______
export default abstract class InputBase<Options extends BaseOptions = {}> {

	protected options: Required<BaseOptions> & Options;
	protected elRoot: HTMLElement;
	protected elements: {[key:string]: HTMLElement} = {};
	protected elInput: HTMLInputElement | HTMLSelectElement;

	protected abstract buildInput(): typeof this.elInput;

	constructor( public key: string, options: Options ){
		this.options = Object.assign( {
			relativeElement: null,
			relativePosition: 'append' as const,
			label: null,
			onChange: () => {},
			value: null,
			inputAttr: {},
		}, options );
		
		this.elRoot = createElement( 'div', {
			relativeElement: this.options.relativeElement,
			relativePosition: this.options.relativePosition,
			className: 'input-field',
		} );
		
		if( this.options.label ){
			this.elements.label = createElement( 'label', {
				relativeElement: this.elRoot,
				innerText: this.options.label,
				attr: {
					for: this.key,
				},
			} );
		}
		
		this.elInput = this.buildInput();
		this.elInput.setAttribute('name', this.key );
		this.elInput.setAttribute('id', this.key );
		this.elInput.setAttribute('tabIndex', '1' );
		for ( const key in this.options.inputAttr ){
			this.elInput.setAttribute( key, this.options.inputAttr[ key ] );
		}

		if( this.options.value ){
			this.setValue( this.options.value );
		}
		
		InputBase.add( this );
	}

	protected value: any;
	
	getValue(): any {
		return this.elInput.value;
	}
	
	setValue( value: any ){
		this.value = this.options.value;
		this.elInput.value = this.options.value;
	}
	
	protected handleChange = ( event: Event ) => {
		const value = this.getValue();
		if( value === this.value ){ return;}
		this.value = value;
		this.options.onChange( this.value, this.key, this );
	}

	getMainElement(){
		return this.elRoot
	}

	remove(){
		this.beforeDestroy();
		this.elRoot.remove();
	}

	abstract beforeDestroy(): void

	//___ static
	static instances: InputBase[] = [];

	static add ( instance: InputBase ){
		this.instances.push( instance );
	}

	static beforeDestroy (){
		this.instances.forEach( instance => {
			instance.beforeDestroy();
		} );
		this.instances = [];
	}
}

