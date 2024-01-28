
//___ generic
declare type Override<T, R> = Omit<T, keyof R> & R;

declare type OrRef<T> = T | import('vue').Ref<T>;

declare type OrArray<T> = T | T[];

declare type OrPromise<T> = T | Promise<T>;

declare type DeepRequired<T> = { [K in keyof T]: DeepRequired<T[K]> } & Required<T>;

declare type BooleanMap<KeyType extends string | number = string> = Map<KeyType, boolean>;

declare type MapKey<M> = M extends Map<infer V, any> ? V : never;

declare type MapValue<M> = M extends Map<any, infer V> ? V : never;

declare type KeyOf<T extends object,K extends string|number|symbol> = Extract<keyof T, K>;

declare type KeyOfString<T extends object> = KeyOf<T,string>;

declare type KeyOfValue<O extends object,V,OK extends KeyOfString<O>=KeyOfString<O>> = { [K in OK]-?: O[K] extends V ? K : never }[OK];

declare type SelectItem<T extends ( string | number ) = string> = {
  label: string;
  value: T;
}

//___ trading
declare type UserAsset = {
  asset: string;
  free: string;
  btcValuation?: string;
  freeze?: string;
  ipoable?: string;
  locked?: string;
  withdrawing?: string;
  smartFreeze?: Record<string,number>;
  smartFreezeTotal?: number;
  isStable?: boolean;
};

declare type SmartOrder = {
  orderId: number|string;
  side: 'BUY' | 'SELL';
  type: string;//"LIMIT";
  status: string;//"NEW";
  assetQuote: string;
  assetBase: string;
  symbol?: string;
  quantity: string;
  price?: string;
  stopPrice?: string;
  watched?: boolean;
  runningTime?: string;
  createdAt?: string;
  updatedAt?: string;
  exchangeOrderId?: number;
  stopDir?: '>=' | '<=';
  stopLoss?: string;
  stopLossDir?: '>=' | '<=';
  stopTrailing?: string;
  triggerReason?: string;
  triggeredTime?: number;
  trailingState?: {
    dir: number;
    max: number;
    distPercent: number;
    warning: boolean;
  }
  executed?: {
    transactionTime: number,
    quantity: string | number,
    quoteQuantity: string | number,
    averagePrice: string|number,
  }
}

type PartialOrder = Partial<SmartOrder> & {
  // orderId: SmartOrder['orderId'];
  // status: string;
}

type OrderCreate = Partial<SmartOrder> & Pick<SmartOrder,'side'|'type'|'assetBase','assetQuote','quantity'>

type DbError = {
  name: string;
  errors: {
    message: string;
    type: string;
  }[];
}

type ServiceError = {
  status: number;
  statusText: string;
}

type ResponseError = DbError | ServiceError;

type NotifError = ResponseError | Error;

type KeyedNotifError = {
  key?: string | number;
  error: NotifError;
}

type MinMax = { min: number, max: number };