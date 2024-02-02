
import type { Base } from './index.ts';
export type ComputeFunc = ( index: number ) => number;

//______
export default class Computation<ComputeKey extends string> {
	
	constructor(
		private indicator: InstanceType<typeof Base>,
	){
	}
	
	sma( prop: ComputeKey, length: number = 3 ): ComputeFunc {
		if ( !length ){
			throw new Error( 'length must be != 0');
		}

		const sum = this.sum( prop, length );
		return ( index ) => sum( index ) / length;
	}

	sum( prop: ComputeKey, length: number = 3 ): ComputeFunc {
		if ( !length ){
			throw new Error( 'length must be != 0' );
		}
		
		return ( index ): number => {
			return this.indicator.eachTick( index, length,
				( value, i ) => value + this.indicator.computed( i, prop ) );
		};
	}

	static asNumber( value?: any, _default = 0 ): number {
		return +value || _default;
	}
}

