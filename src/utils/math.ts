
export function decimal( n: number ): number {
  const log = Math.log10( n );
  return Math.pow( 10, Math.floor( log ) );
}

export function roundPrecision( _num: number | string, precision: number = 1 ): string{
  const num: number = typeof _num === 'string' ? +( _num as any ) : _num;
  const k = `${ precision }`.split( '.' );
  const res = Math.floor( num / precision ) * precision;
  // console.log('roundPrecision', { num, precision, digits: k[1].length, round: Math.round( num / precision ), res } );
  return res.toFixed( k.length > 1 ? k[ 1 ].length : 0 );
}

export function arrMin<T extends number | Object = number>( arr: T[], property: T extends Object ? keyof T : null ){
  const g = property ? ( v: T ) => v[property as keyof T] : ( v: T ) => v;
  return arr.reduce( ( a, b ) => Math.min( a, g( b ) as number ), +Infinity );
}

export function arrMax<T extends number | Object = number>( arr: T[], property: T extends Object ? keyof T : null ){
  const g = property ? ( v: T ) => v[property as keyof T] : ( v: T ) => v;
  return arr.reduce( ( a, b ) => Math.max( a, g( b ) as number ), -Infinity );
}

//___ Scale
export type Scale = {
  min: number,
  max: number,
}

export type ScalingLinearOptions = {
  precisionOut?: number,
  precisionIn?: number,
  stringPrecision?: number,
}

export class ScalingLinear {
  scaleIn: Scale = { min: 0, max: 1 };
  scaleOut: Scale = { min: 0, max: 1 };
  
  private mult = 1;
  private multInv= 1;
  distIn = 1;
  distOut = 1;
  private options: Required<ScalingLinearOptions> = {
    precisionOut: 1,
    precisionIn: 1,
    stringPrecision: 1,
  };

  constructor( scaleIn: Scale, scaleOut: Scale, options?: ScalingLinearOptions ){
    this.setScaleIn( scaleIn );
    this.setScaleOut( scaleOut );
    if( options ){
      Object.assign( this.options, options );
    }
    
    this.update();
  }
  
  getOption<T extends keyof ScalingLinear['options']>( name: T ): ScalingLinear['options'][T] {
    return this.options[name];
  }
  
  setOption<T extends keyof ScalingLinearOptions>( name: T, value: Required<ScalingLinearOptions>[T] ){
    this.options[name] = value;
  }
  
  setScaleIn( scale: Scale ){
    this.scaleIn = scale;
    // if ( scale.min === this.scaleIn.min && scale.max === this.scaleIn.max ){
    //   return false;
    // }
    this.distIn = this.scaleIn.max - this.scaleIn.min;
    this.update();
    return true;
  }
  
  setScaleOut( scale: Scale ){
    this.scaleOut = scale;
    this.distOut = this.scaleOut.max - this.scaleOut.min;
    // if ( scale.min === this.scaleOut.min && scale.max === this.scaleOut.max ){
    //   return false;
    // }
    this.update();
    return true;
  }
  
  private update(){
    this.mult = this.distOut / this.distIn;
    this.multInv = this.distIn / this.distOut;
  }

  scaleTo( value: number = 0, precision = this.options.precisionOut ){
    let res = this.scaleOut.min + ( +value - this.scaleIn.min ) * this.mult;
    // console.log('scaleTo', this );
    if ( precision ){
      res = Math.round( res / precision ) * precision;
    }
    return res;
  }

  scaleToInv( value: number = 0, precision = this.options.precisionIn ){
    let res = this.scaleIn.min + ( +value - this.scaleOut.min ) * this.multInv;
    if ( precision ){
      res = Math.round( res / precision ) * precision;
    }
    return res;
  }
}

export function ma ( values: number[], length: number ){
  const res = [  values[ 0 ] ];
  let sum = 0;
  for ( let i = 0, max = values.length; i < max; i++ ){
    sum += values[i];
    // console.log('i', i, sum );
    if( values[i-length] ){
      sum -= values[ i - length ];
    }
    res[i] = sum / length;
    // console.log( '  res', res[ i ], sum );
  }
  return res;
}

export function emaArray ( values: number[], length: number ){
  const alpha = 2 / ( length + 1 );
  const res = [  values[ 0 ] ];
  for ( let i = 1, max = values.length; i < max; i++ ){
    res[i] = ema( alpha, values[i], res[i-1] );
    // res[i] = values[ i ] * alpha + res[ i - 1 ] * alphaInv;
  }
  return res;
}

export function ema ( alpha: number, value: number, prevEma: number ){
  return value * alpha + prevEma * ( 1 - alpha );
}

