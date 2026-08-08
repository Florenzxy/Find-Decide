export const DATA_CHANGED_EVENT = "find-a-decide:data-changed";

export function emitDataChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}
