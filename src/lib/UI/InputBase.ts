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
		
		this.elements.wrapper = createElement( 'div', {
			relativeElement: this.options.relativeElement,
			relativePosition: this.options.relativePosition,
			className: 'input-field',
			style: {
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: '8px',
			}
		} );
		
		if( this.options.label ){
			this.elements.label = createElement( 'label', {
				relativeElement: this.elements.wrapper,
				innerText: this.options.label,
				style: {
					flex: '1',
					textAlign: 'right',
				},
			} );
		}
		
		this.elInput = this.buildInput();
		this.elInput.setAttribute('name', this.key );
		this.elInput.setAttribute('tabIndex', '1' );
		for ( const key in this.options.inputAttr ){
			this.elInput.setAttribute( key, this.options.inputAttr[ key ] );
		}

		if( this.options.value ){
			this.value = this.options.value;
			this.elInput.value = this.options.value;
		}
		Object.assign( this.elInput.style, {
			flex: '2',
		} );
		this.elements.wrapper.append( this.elInput );
		
		InputBase.add( this );
	}

	protected value: any;
	getValue(){
		return this.value;
	}
	
	setValue( value: any ){
		this.value = value;
	}
	
	protected handleChange = ( event: Event ) => {
		const value = this.inputValue();
		if( value === this.value ){ return;}
		this.value = value;
		// console.log('handleChange', input.value );
		this.options.onChange( value, this.key, this );
	}

	protected inputValue(): Literal | null {
		return this.elInput.value;
	}
	
	getMainElement(){
		return this.elements.wrapper;
	}

	remove(){
		this.beforeDestroy();
		this.elements.wrapper.remove();
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

