import deepMerge from 'deepmerge';

const	deepMergeOptions = { arrayMerge: ( destinationArray: any[], sourceArray: any[]/*, options*/ ) => sourceArray };

export default function merge<T>( target: Partial<T>, source: Partial<T> ){
	return deepMerge( target, source, deepMergeOptions );
}
