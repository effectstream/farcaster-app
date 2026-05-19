import { useEffect, useState } from "react";
import { getMiniAppContext } from "../miniapp.ts";

export interface MiniAppUser {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface MiniAppCtx {
  user?: MiniAppUser;
  client?: { name?: string };
}

export function useMiniAppContext(): MiniAppCtx | undefined {
  const [ctx, setCtx] = useState<MiniAppCtx | undefined>();
  useEffect(() => {
    (async () => {
      const c = await getMiniAppContext();
      if (c) setCtx(c as MiniAppCtx);
    })();
  }, []);
  return ctx;
}
