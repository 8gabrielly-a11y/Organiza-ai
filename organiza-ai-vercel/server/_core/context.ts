import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { HttpRequest, HttpResponse } from "./httpTypes";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: HttpRequest;
  res: HttpResponse;
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req as unknown as HttpRequest);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req as unknown as HttpRequest,
    res: opts.res as unknown as HttpResponse,
    user,
  };
}
