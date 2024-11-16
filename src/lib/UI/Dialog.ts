import { createElement } from '../index.ts';

//_____
export type Options = {
	parentElement?: HTMLElement,
	title?: string | null,
	buttons?: null | {
		ok?: () => void,
		cancel?: () => void,
	},
	content?: HTMLElement | null,
}

//______
export default class Dialog {
	private options: Required<Options> = {
		parentElement: document.body,
		title: null,
		buttons: { 
			cancel: () => {},
			ok: () => {},
		},
		content: null,
	}
	
	private elements: {[key:string]: HTMLElement} = {};
	
	constructor( options: Options = {} ){
		Object.assign( this.options, { ...options,
			buttons: { ...this.options.buttons, ...options.buttons },
		} );
		this.createElements();
		
		this.setContent( options.content );

		//___
		Dialog.add( this );
	}
	
	createElements(){
		
		this.elements.wrapper = createElement('div', {
			relativeElement: this.options.parentElement,
			className: 'dialog-wrapper',
			style: {
				display: 'none',
				position: 'fixed',
				zIndex: '999',
				inset: '0 0 0 0',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '50px',
			}
		});
		this.elements.wrapper.addEventListener( 'mousedown', this.handleClose );

		this.elements.dialog = createElement('div', {
			relativeElement: this.elements.wrapper,
			className: 'dialog',
			style: {
				position: 'absolute',
				minWidth: '600px',
				minHeight: '100px',
				maxHeight: '90%',
				maxWidth: '90%',
				display: 'flex',
				flexDirection: 'column',
			}
		});
		this.elements.dialog.addEventListener( 'mousedown', this.handleClickDialog );
		this.elements.dialog.tabIndex = 0;
		this.elements.dialog.addEventListener( 'keydown', this.handleKeydown );

		this.elements.head = createElement( 'div', {
			relativeElement: this.elements.dialog,
			className: 'dlg-head',
			style: {
				position: 'relative',
				// padding: '0.5rem 2rem 0.5rem 1rem',
			}
		} );

		this.elements.title = createElement( 'div', {
			relativeElement: this.elements.head,
			className: 'dlg-title',
			style: {
				fontSize: '1.5rem',
				fontWeight: '100',
			}
		} );

		if( this.options.title ){
			this.elements.title.innerText = this.options.title;
		}

		this.elements.btClose = createElement( 'button', {
			relativeElement: this.elements.head,
			className: 'bt-close',
			style: {
				position: 'absolute',
				right: '12px',
				top: '50%',
				marginTop: '-12px',
				zIndex: '150',
				padding: '0',
			},
			events: {
				click: this.handleClose,
			},
		} );
		this.elements.btClose.addEventListener( 'click', this.handleClose );

		createElement( 'span', {
			relativeElement: this.elements.btClose,
			className: 'icon ic-close',
			style: {
				width: '24px',
				height: '24px',
			}
		} );

		this.elements.content = createElement( 'div', {
			relativeElement: this.elements.dialog,
			className: 'dlg-content',
			style: {
				flex: '1 1',
			}
		} );

		this.elements.foot = createElement( 'div', {
			relativeElement: this.elements.dialog,
			className: 'dlg-foot',
			style: {
				padding: '1rem 1.5rem',
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'flex-end',
				gap: '8px',
			}
		} );
		
		if( this.options.buttons?.cancel ){
			this.elements.btCancel = createElement( 'button', {
				relativeElement: this.elements.foot,
				innerText: 'Cancel',
				events: {
					click: this.handleClose,
				},
			} );
		}

		if( this.options.buttons?.ok ){
			this.elements.btOk = createElement( 'button', {
				relativeElement: this.elements.foot,
				innerText: 'OK',
				events: {
					click: this.handleOk,
				},
			} );
		}
	}
	
	private elContent: HTMLElement | null = null;
	
	setContent( content?: HTMLElement | null ){
		if ( content !== this.elContent ){
			if ( this.elContent ){
				this.elContent.remove();
			}
			if ( content ){
				this.elContent = content;
				this.elements.content.append( this.elContent );
			}
		}
	}
	
	display( show = true, options: { title?: string | null, content?: HTMLElement | null } = {} ){
		if( show ){
			if ( options.title ){
				this.elements.title.innerText = options.title;
			}
			if( options.content ){
				this.setContent( options.content );
			}
			setTimeout( () =>{
				this.elements.dialog.focus();
			}, 50 );
		}
		this.elements.wrapper.style.display = show ? 'flex' : 'none';
	}

	beforeDestroy(){
		this.elements.wrapper.removeEventListener( 'mousedown', this.handleClose );
		this.elements.dialog.removeEventListener( 'mousedown', this.handleClickDialog );
		this.elements.btClose.removeEventListener( 'click', this.handleClose );
		this.elements.btCancel.removeEventListener( 'click', this.handleClose );
		this.elements.btOk.removeEventListener( 'click', this.handleOk );
		this.elements.wrapper.remove();
	}
	
	private handleClose = () => {
		this.display( false );
	}

	private handleOk = () => {
		this.options.buttons?.ok?.();
		this.display( false );
	}

	private handleClickDialog = ( ev: MouseEvent ) => {
		ev.stopImmediatePropagation();
	}

	private handleKeydown = ( event: KeyboardEvent ) => {
		switch ( event.keyCode ){
			default:
				break;
			case 27:{//_ escape
				this.handleClose();
				break;
			}
		}
	}

	//___ static
	static instances: Dialog[] = [];

	static add ( instance: Dialog ){
		this.instances.push( instance );
	}

	static beforeDestroy (){
		this.instances.forEach( dialog => {
			dialog.beforeDestroy();
		});
		this.instances = [];
	}

}