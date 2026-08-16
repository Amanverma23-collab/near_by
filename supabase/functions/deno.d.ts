declare module 'https://*' {
  export const serve: any;
  export const createClient: any;
  export const crypto: any;
  export default {} as any;
}

declare module 'https://deno.land/*' {
  export const serve: any;
  export const crypto: any;
}

declare module 'https://esm.sh/*' {
  export const createClient: any;
}

declare namespace Deno {
  export namespace env {
    export function get(key: string): string | undefined;
    export function set(key: string, value: string): void;
  }
}
