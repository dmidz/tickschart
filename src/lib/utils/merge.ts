import deepMerge from 'deepmerge';

const	deepMergeOptions = { arrayMerge: ( destinationArray: any[], sourceArray: any[]/*, options*/ ) => sourceArray };

export default function merge<T,S>( target: T, source: S ): T & S {
	return deepMerge<T,S>( target, source, deepMergeOptions );
}
