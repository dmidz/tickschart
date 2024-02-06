
//__ provides the decimal floor of a number: ex: 43.75 -> 10, 7.44 -> 1, 518.28 -> 100, 0.00875 -> 0.001
export function decimal( value: number ): number {
  const log = Math.log10( value );
  return Math.pow( 10, Math.floor( log ) );
}

export function roundPrecision( value: number | string, precision: number = 1 ): string {
  const num = +value;
  const k = `${ precision }`.split( '.' );
  const res = Math.floor( num / precision ) * precision;
  return res.toFixed( k.length > 1 ? k[ 1 ].length : 0 );
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
  scaleInMax?: (() => number | null ),
  debug?: boolean,
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
    scaleInMax: () => null,
    debug: false,
  };

  private distInMax: number | null = null;
  private distInMin: number | null = null;

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
    const distIn = this.scaleIn.max - this.scaleIn.min;
    if( this.distInMax !== null ){
      let d = distIn - this.distInMax;
      if( d > 0 ){
        d /= 2;
        this.scaleIn.min += d;
        this.scaleIn.max -= d;
      }
    }
    
    if( this.distInMin !== null ){
      let d = distIn - this.distInMin;
      if( d < 0 ){
        d /= 2;
        this.scaleIn.min += d;
        this.scaleIn.max -= d;
      }
    }

    const scaleInMax = this.options.scaleInMax();
    if ( scaleInMax !== null ){
      this.scaleIn.min = Math.min( this.scaleIn.min, scaleInMax );
    }
    
    // this.options.debug && console.warn('distIn', scale, this.distIn, distIn, this.scaleIn.max - this.scaleIn.min );
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
  
  setDistInMax ( value: number ){
    if ( value <= 0 ){
      console.warn( 'value must be > 0', value );
      return;
    }
    this.distInMax = value;
    this.setScaleIn( this.scaleIn );
  }

  setDistInMin ( value: number ){
    if ( value <= 0 ){
      console.warn( 'value must be > 0', value );
      return;
    }
    this.distInMin = value;
    this.setScaleIn( this.scaleIn );
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

  private update (){
    this.mult = this.distOut / this.distIn;
    this.multInv = this.distIn / this.distOut;
  }

}