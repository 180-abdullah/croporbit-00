"use client";
import { useSyncExternalStore } from "react";
const noop = () => () => {};
export function ClientOnly({ children, height = 260 }: { children: React.ReactNode; height?: number }) {
  const on = useSyncExternalStore(noop, () => true, () => false);
  return on ? <>{children}</> : <div style={{ height }} aria-hidden />;
}
