
declare type Override<T, R> = Omit<T, keyof R> & R;

declare type OrPromise<T> = T | Promise<T>;

declare type KeyOf<T extends object,K extends string|number|symbol> = Extract<keyof T, K>;

declare type KeyOfString<T extends object> = KeyOf<T,string>;

declare type KeyOfValue<O extends object,V,OK extends KeyOfString<O>=KeyOfString<O>> = { [K in OK]-?: O[K] extends V ? K : never }[OK];

declare type MinMax = { min: number, max: number };

declare type PickOptional<T extends object> = { [K in keyof T as ( undefined extends T[K] ? K : never )]: T[K] }

declare type PickRequired<T extends object> = { [K in keyof T as ( undefined extends T[K] ? never : K )]: T[K] }

declare type ReverseRequired<T extends object> = Required<PickOptional<T>> & Partial<PickRequired<T>>;

declare type ObjKeyStr = { [ key: string ]: any };

declare type SelectItem = {
	label: string;
	value: Literal;
}

declare type Literal = string | number | boolean;

declare type NestedKeyOf<O extends object,NoObjKeys extends boolean = true> = {
		[K in keyof O & ( string | number )]: O[K] extends Literal|undefined
			? `${ K }`
			: ( NoObjKeys extends true ? never : `${ K }` ) | `${ K }.${ NestedKeyOf<O[K],NoObjKeys> }`
	}[keyof O & ( string | number )];

declare type DeepRequired<T> = Required<{
	[K in keyof T]: DeepRequired<T[K]>
}>

declare type DeepPartial<T> = Partial<{
	[K in keyof T]: DeepPartial<T[K]>
}>
