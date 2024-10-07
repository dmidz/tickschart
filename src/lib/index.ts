import '@public/assets/main.css';

export { default as Chart } from './Chart.ts';
export { default as Fetcher } from './Fetcher.ts';
export { default as Player } from './Player.ts';

export type TickProp = 'open' | 'high' | 'low' | 'close' | 'volume';

export type AbstractTick = ObjKeyStr;

export const defaultTick = { time: 0, open: 0, high: 0, low: 0, close: 0, volume: 0 };

export type CandleTick = typeof defaultTick;

export type GetTick<Tick extends AbstractTick = CandleTick> = ( i: number, delta?: number ) => Tick;

export type ElementRect = HTMLElement & { rect?: ReturnType<Element['getBoundingClientRect']> };

//__ utils
export function sharpCanvasValue ( value: number, add = 0 ){
	return Math.floor( value ) + add;
}

export function resizeCanvas ( canvas: HTMLCanvasElement | undefined ){
	let resized: false | { width: number, height: number } = false;

	if ( !canvas ){
		return resized;
	}
	if ( !canvas.parentElement ){
		console.warn( 'canvas has no parentElement', canvas );
		return resized;
	}

	canvas.style.display = 'none';
	const width = Math.max( 1, Math.floor( canvas.parentElement.clientWidth ) );
	const height = Math.max( 1, Math.floor( canvas.parentElement.clientHeight ) );
	// console.log( 'resizeCanvas', { width, height }, canvas.width, canvas.height );

	if ( width !== canvas.width || height !== canvas.height ){

		// console.log( 'setSize', { width: this.width, height: this.height } );
		canvas.width = width;
		canvas.height = height;

		canvas.style.width = `${ width }px`;
		canvas.style.height = `${ height }px`;

		resized = { width, height };
	}

	canvas.style.display = 'block';//__ get rid of extra pixels around
	return resized;
}

export function createElement ( tagName: string = 'div', parentNode?: HTMLElement, options: {
	style?: Partial<CSSStyleDeclaration>,
	className?: string,
	innerText?: string,
} = {} ): HTMLElement{
	const el = document.createElement( tagName );
	if ( options.className ){
		el.className = options.className;
	}
	if ( options.style ){
		Object.assign( el.style, options.style );
	}
	if ( options.innerText ){
		el.innerText = options.innerText;
	}
	if ( parentNode ){
		parentNode.append( el );
	}
	return el;
}

export class ListenerEventFactory<Callback extends (( ...args: any[] ) => void)> {
	private listeners: Callback[] = [];
	constructor (){
	}
	
	add( callback: Callback ): this {
		this.remove( callback );
		this.listeners.push( callback );
		return this;
	}
	
	remove( callback: Callback ): this {
		this.listeners.forEach( ( c, index) => {
			if ( c === callback ){
				this.listeners.splice( index, 1 );
				return false;
			}
		} );
		return this;
	}
	
	dispatch( ...args: Parameters<Callback> ): this {
		this.listeners.forEach( c => {
			c( ...args );
		});
		return this;
	}
	
	clear(){
		this.listeners = [];
	}
}


//__ intervals
const s1 = 1000;
const m1 = s1 * 60;
const h1 = m1 * 60;
const d1 = h1 * 24;
const w1 = d1 * 7;

export const intervalsMs = { s1, m1, h1, d1, w1 };

