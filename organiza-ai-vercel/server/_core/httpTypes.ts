export type HttpRequest = {
  url: string;
  path?: string;
  protocol?: string;
  ip?: string;
  query: Record<string, unknown>;
  params: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined> & {
    cookie?: string;
    authorization?: string;
    "x-forwarded-proto"?: string | string[];
  };
  get(name: string): string | undefined;
};

export type HttpResponse = {
  headersSent?: boolean;
  status(code: number): HttpResponse;
  json(body: unknown): HttpResponse;
  send(body: unknown): HttpResponse;
  end(): HttpResponse;
  redirect(statusOrUrl: number | string, url?: string): HttpResponse;
  cookie(name: string, value: string, options?: Record<string, unknown>): HttpResponse;
  clearCookie(name: string, options?: Record<string, unknown>): HttpResponse;
  set(field: string, value: string): HttpResponse;
  setHeader(name: string, value: string): HttpResponse;
};

export type HttpNext = (error?: unknown) => void;

export type HttpApp = {
  get(path: string, handler: (...args: any[]) => unknown): HttpApp;
  post(path: string, handler: (...args: any[]) => unknown): HttpApp;
  use(...args: any[]): HttpApp;
};
