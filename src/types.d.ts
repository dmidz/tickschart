
declare type Override<T, R> = Omit<T, keyof R> & R;

declare type OrPromise<T> = T | Promise<T>;

declare type KeyOf<T extends object,K extends string|number|symbol> = Extract<keyof T, K>;

declare type KeyOfString<T extends object> = KeyOf<T,string>;

declare type KeyOfValue<O extends object,V,OK extends KeyOfString<O>=KeyOfString<O>> = { [K in OK]-?: O[K] extends V ? K : never }[OK];

declare type MinMax = { min: number, max: number };

declare type PickOptional<T extends object> = { [K in keyof T as ( undefined extends T[K] ? K : never )]: T[K] }

declare type PickRequired<T extends object> = { [K in keyof T as ( undefined extends T[K] ? never : K )]: T[K] }

declare type ReverseRequired<T extends object> = Required<PickOptional<T>> & Partial<PickRequired<T>>;
