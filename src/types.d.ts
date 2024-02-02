
//___ generics
declare type OrPromise<T> = T | Promise<T>;

declare type KeyOf<T extends object,K extends string|number|symbol> = Extract<keyof T, K>;

declare type KeyOfString<T extends object> = KeyOf<T,string>;

declare type KeyOfValue<O extends object,V,OK extends KeyOfString<O>=KeyOfString<O>> = { [K in OK]-?: O[K] extends V ? K : never }[OK];

declare type MinMax = { min: number, max: number };